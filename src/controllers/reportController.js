import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Certificate from '../models/Certificate.js';

// @desc    Get overview stats
// @route   GET /api/reports/overview
// @access  Private/Admin
export const getOverview = async (req, res, next) => {
  try {
    const isOrgScoped = req.user.role === 'admin' && req.user.organization;
    let query = {};
    if (isOrgScoped) query.organization = req.user.organization;

    const totalUsers = await User.countDocuments(query);
    const totalCourses = await Course.countDocuments(query);
    const activeUsers = await User.countDocuments({ ...query, status: 'active' });
    const publishedCourses = await Course.countDocuments({ ...query, status: 'published' });

    let totalEnrollments;
    let totalCertificates;
    let completedEnrollments;
    if (isOrgScoped && req.user.organization) {
      const orgCourseIds = (await Course.find(query).select('_id').lean()).map((c) => c._id);
      totalEnrollments = await Enrollment.countDocuments({ course: { $in: orgCourseIds } });
      totalCertificates = await Certificate.countDocuments({ course: { $in: orgCourseIds } });
      completedEnrollments = await Enrollment.countDocuments({
        status: 'completed',
        course: { $in: orgCourseIds },
      });
    } else {
      totalEnrollments = await Enrollment.countDocuments();
      totalCertificates = await Certificate.countDocuments();
      completedEnrollments = await Enrollment.countDocuments({ status: 'completed' });
    }
    const completionRate =
      totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        totalCertificates,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course completion analytics
// @route   GET /api/reports/courses
// @access  Private/Admin/Trainer
export const getCourseAnalytics = async (req, res, next) => {
  try {
    let courseQuery = {};
    if (req.user.role === 'trainer') {
      courseQuery.trainer = req.user._id;
    } else if (req.user.role === 'admin' && req.user.organization) {
      courseQuery.organization = req.user.organization;
    }

    const courses = await Course.find(courseQuery).select('title');

    const courseStats = await Promise.all(
      courses.map(async (course) => {
        const enrollments = await Enrollment.find({ course: course._id });
        const completed = enrollments.filter((e) => e.status === 'completed').length;
        const inProgress = enrollments.filter((e) => e.status === 'in_progress').length;
        const enrolled = enrollments.filter((e) => e.status === 'enrolled').length;

        const avgProgress =
          enrollments.length > 0
            ? Math.round(
                enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
              )
            : 0;

        return {
          courseId: course._id,
          courseTitle: course.title,
          totalEnrollments: enrollments.length,
          completed,
          inProgress,
          enrolled,
          avgProgress,
          completionRate:
            enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: courseStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user performance metrics
// @route   GET /api/reports/users
// @access  Private/Admin
export const getUserMetrics = async (req, res, next) => {
  try {
    let userQuery = {};
    if (req.user.role === 'admin' && req.user.organization) {
      userQuery.organization = req.user.organization;
    }

    const users = await User.find(userQuery).select('email profile role status');

    const userStats = await Promise.all(
      users.map(async (user) => {
        const enrollments = await Enrollment.find({ user: user._id });
        const completed = enrollments.filter((e) => e.status === 'completed').length;
        const inProgress = enrollments.filter((e) => e.status === 'in_progress').length;

        const avgProgress =
          enrollments.length > 0
            ? Math.round(
                enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
              )
            : 0;

        const quizAttempts = await QuizAttempt.find({ user: user._id });
        const avgQuizScore =
          quizAttempts.length > 0
            ? Math.round(
                quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length
              )
            : 0;

        const certificates = await Certificate.countDocuments({ user: user._id });

        return {
          userId: user._id,
          email: user.email,
          name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email,
          role: user.role,
          status: user.status,
          totalEnrollments: enrollments.length,
          completedCourses: completed,
          inProgressCourses: inProgress,
          avgProgress,
          avgQuizScore,
          certificates,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export reports as CSV
// @route   GET /api/reports/export
// @access  Private/Admin
export const exportReports = async (req, res, next) => {
  try {
    const { type } = req.query;

    if (type === 'users') {
      const response = await getUserMetrics(req, res, next);
      if (response) {
        const csv = convertToCSV(response.data.data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=user-reports.csv');
        return res.send(csv);
      }
    } else if (type === 'courses') {
      const response = await getCourseAnalytics(req, res, next);
      if (response) {
        const csv = convertToCSV(response.data.data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=course-reports.csv');
        return res.send(csv);
      }
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid export type',
    });
  } catch (error) {
    next(error);
  }
};

const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};


