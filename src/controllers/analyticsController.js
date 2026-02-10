import Enrollment from '../models/Enrollment.js';
import LessonProgress from '../models/LessonProgress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Quiz from '../models/Quiz.js';
import Course from '../models/Course.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import LiveClass from '../models/LiveClass.js';
import Attendance from '../models/Attendance.js';

/** Get all lesson IDs for a course (course must have modules populated with lessons). */
function getCourseLessonIds(course) {
  if (!course?.modules?.length) return [];
  return course.modules.flatMap((m) => (m.lessons || []).map((l) => l._id));
}

// @desc    Get student performance analytics
// @route   GET /api/analytics/student-performance
// @access  Private/Admin/Trainer
export const getStudentPerformance = async (req, res, next) => {
  try {
    const { studentId, courseId, period } = req.query;

    let query = {};
    if (studentId) query.user = studentId;
    if (courseId) query.course = courseId;

    // Get enrollments (skip invalid refs e.g. deleted course)
    let enrollments = await Enrollment.find(query)
      .populate('user', 'email profile')
      .populate('course', 'title');
    enrollments = enrollments.filter((e) => e.course && e.course._id && e.user && e.user._id);

    const performanceData = await Promise.all(
      enrollments.map(async (enrollment) => {
        // LessonProgress has user + lesson (no enrollment ref). Get course lessons then progress for this user.
        const courseWithLessons = await Course.findById(enrollment.course._id)
          .populate({ path: 'modules', populate: { path: 'lessons' } })
          .lean();
        const lessonIds = getCourseLessonIds(courseWithLessons);
        const progress = await LessonProgress.find({
          user: enrollment.user._id,
          lesson: { $in: lessonIds },
        });

        const completedLessons = progress.filter((p) => p.completed).length;
        const totalLessons = lessonIds.length;
        const computedRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        const enrollmentProgress = Number(enrollment.progress) || 0;
        // When status is completed, show 100%; otherwise use computed rate or stored progress
        const completionRate =
          enrollment.status === 'completed' ? 100 : Math.max(computedRate, enrollmentProgress);

        // QuizAttempt has quiz ref (not course). Get quizzes for this course then attempts.
        const courseQuizIds = (await Quiz.find({ course: enrollment.course._id }).select('_id').lean()).map((q) => q._id);
        const quizAttempts = courseQuizIds.length > 0
          ? await QuizAttempt.find({
              user: enrollment.user._id,
              quiz: { $in: courseQuizIds },
            })
          : [];

        const averageScore =
          quizAttempts.length > 0
            ? quizAttempts.reduce((sum, attempt) => sum + (attempt.percentage ?? attempt.score ?? 0), 0) /
              quizAttempts.length
            : 0;

        // Time spent: use enrollment.totalTimeSpent (minutes) if set, else LessonProgress, else estimate from completed lessons
        const progressTimeSpent = progress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
        let totalTimeSpentMinutes = Number(enrollment.totalTimeSpent) || progressTimeSpent;
        if (totalTimeSpentMinutes === 0 && completedLessons > 0 && courseWithLessons?.modules) {
          const lessonToDuration = new Map();
          for (const mod of courseWithLessons.modules || []) {
            for (const les of mod.lessons || []) {
              lessonToDuration.set(les._id?.toString(), les.duration && les.duration > 0 ? les.duration : 5);
            }
          }
          const estimated = progress
            .filter((p) => p.completed)
            .reduce((sum, p) => sum + (lessonToDuration.get(p.lesson?.toString()) || 5), 0);
          totalTimeSpentMinutes = estimated;
        }

        // Get certificates
        const certificates = await Certificate.find({
          user: enrollment.user._id,
          course: enrollment.course._id,
        });

        return {
          enrollment: {
            _id: enrollment._id,
            status: enrollment.status,
            progress: enrollmentProgress,
            enrolledAt: enrollment.createdAt,
            expiresAt: enrollment.expiresAt,
          },
          student: {
            _id: enrollment.user._id,
            email: enrollment.user.email,
            name: `${enrollment.user.profile?.firstName || ''} ${enrollment.user.profile?.lastName || ''}`.trim(),
          },
          course: {
            _id: enrollment.course._id,
            title: enrollment.course.title,
          },
          metrics: {
            completionRate: Math.round(completionRate * 100) / 100,
            completedLessons,
            totalLessons,
            averageScore: Math.round(averageScore * 100) / 100,
            quizAttempts: quizAttempts.length,
            timeSpent: Math.round(totalTimeSpentMinutes),
            certificatesEarned: certificates.length,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: performanceData.length,
      data: performanceData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course engagement stats
// @route   GET /api/analytics/course-engagement
// @access  Private/Admin/Trainer
export const getCourseEngagement = async (req, res, next) => {
  try {
    const { courseId, period } = req.query;

    let courseQuery = {};
    if (courseId) courseQuery._id = courseId;

    const courses = await Course.find(courseQuery)
      .populate({ path: 'modules', populate: { path: 'lessons' } });

    const engagementData = await Promise.all(
      courses.map(async (course) => {
        // Get enrollments
        const enrollments = await Enrollment.find({ course: course._id });
        const totalEnrollments = enrollments.length;
        const activeEnrollments = enrollments.filter((e) => e.status === 'enrolled').length;

        const lessonIds = getCourseLessonIds(course);
        const totalLessonsInCourse = lessonIds.length;

        // LessonProgress has user + lesson (no enrollment). Per-enrollment completion then average.
        let totalCompletionRateSum = 0;
        for (const enrollment of enrollments) {
          const userId = enrollment.user?._id ?? enrollment.user;
          if (!userId) continue;
          const enrollmentProgress = enrollment.progress ?? 0;
          if (lessonIds.length === 0) {
            totalCompletionRateSum += enrollmentProgress;
            continue;
          }
          const progress = await LessonProgress.find({
            user: userId,
            lesson: { $in: lessonIds },
          });
          const completed = progress.filter((p) => p.completed).length;
          const computedRate = totalLessonsInCourse > 0 ? (completed / totalLessonsInCourse) * 100 : 0;
          totalCompletionRateSum += Math.max(computedRate, enrollmentProgress);
        }
        const averageCompletionRate =
          enrollments.length > 0 ? totalCompletionRateSum / enrollments.length : 0;

        // QuizAttempt has quiz ref; get attempts for this course's quizzes
        const courseQuizIds = (await Quiz.find({ course: course._id }).select('_id').lean()).map((q) => q._id);
        const quizAttempts = courseQuizIds.length > 0
          ? await QuizAttempt.find({ quiz: { $in: courseQuizIds } })
          : [];

        const averageQuizScore =
          quizAttempts.length > 0
            ? quizAttempts.reduce((sum, attempt) => sum + (attempt.percentage ?? attempt.score ?? 0), 0) /
              quizAttempts.length
            : 0;

        // Get certificates issued
        const certificates = await Certificate.find({ course: course._id });

        // Get live class attendance
        const liveClasses = await LiveClass.find({ course: course._id });
        const totalLiveClassAttendance = await Attendance.countDocuments({
          liveClass: { $in: liveClasses.map((lc) => lc._id) },
          status: 'present',
        });

        // Calculate engagement score (0-100)
        const engagementScore =
          (averageCompletionRate * 0.4 +
            (averageQuizScore / 100) * 30 +
            (certificates.length / Math.max(totalEnrollments, 1)) * 20 +
            (totalLiveClassAttendance / Math.max(liveClasses.length, 1)) * 10) *
          100;

        return {
          course: {
            _id: course._id,
            title: course.title,
            status: course.status,
          },
          metrics: {
            totalEnrollments,
            activeEnrollments,
            averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
            averageQuizScore: Math.round(averageQuizScore * 100) / 100,
            totalQuizAttempts: quizAttempts.length,
            certificatesIssued: certificates.length,
            liveClassesScheduled: liveClasses.length,
            liveClassAttendance: totalLiveClassAttendance,
            engagementScore: Math.round(engagementScore * 100) / 100,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: engagementData.length,
      data: engagementData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get revenue reports
// @route   GET /api/analytics/revenue
// @access  Private/Admin
export const getRevenueReports = async (req, res, next) => {
  try {
    const { startDate, endDate, period } = req.query;

    let dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    // Get payments
    const payments = await Payment.find({
      status: 'completed',
      ...(Object.keys(dateQuery).length > 0 && { paidAt: dateQuery }),
    })
      .populate('course', 'title')
      .populate('user', 'email profile');

    // Get subscriptions
    const subscriptions = await Subscription.find({
      status: 'active',
      ...(Object.keys(dateQuery).length > 0 && { createdAt: dateQuery }),
    }).populate('user', 'email profile');

    // Calculate revenue (safe fallbacks for missing fields)
    const courseRevenue = payments
      .filter((p) => p.type === 'course_purchase')
      .reduce((sum, p) => sum + (p.finalAmount ?? p.amount ?? 0), 0);

    const subscriptionRevenue = subscriptions.reduce((sum, sub) => sum + (sub.finalPrice ?? 0), 0);
    const totalRevenue = courseRevenue + subscriptionRevenue;

    // Revenue by period
    const revenueByPeriod = {};
    payments.forEach((payment) => {
      const date = new Date(payment.paidAt || payment.createdAt);
      const periodKey = period === 'monthly' 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : period === 'yearly'
        ? String(date.getFullYear())
        : date.toISOString().split('T')[0];
      
      if (!revenueByPeriod[periodKey]) {
        revenueByPeriod[periodKey] = 0;
      }
      revenueByPeriod[periodKey] += payment.finalAmount ?? payment.amount ?? 0;
    });

    // Top selling courses
    const courseSales = {};
    payments
      .filter((p) => p.type === 'course_purchase' && p.course)
      .forEach((payment) => {
        const courseId = payment.course._id.toString();
        if (!courseSales[courseId]) {
          courseSales[courseId] = {
            course: payment.course,
            sales: 0,
            revenue: 0,
          };
        }
        courseSales[courseId].sales += 1;
        courseSales[courseId].revenue += payment.finalAmount ?? payment.amount ?? 0;
      });

    const topSellingCourses = Object.values(courseSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          courseRevenue: Math.round(courseRevenue * 100) / 100,
          subscriptionRevenue: Math.round(subscriptionRevenue * 100) / 100,
          totalPayments: payments.length,
          activeSubscriptions: subscriptions.length,
        },
        revenueByPeriod,
        topSellingCourses,
        recentPayments: payments.slice(0, 20),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get instructor effectiveness
// @route   GET /api/analytics/instructor-effectiveness
// @access  Private/Admin
export const getInstructorEffectiveness = async (req, res, next) => {
  try {
    const { instructorId } = req.query;

    let query = {};
    if (instructorId) query.trainer = instructorId;

    const courses = await Course.find(query)
      .populate('trainer', 'email profile')
      .populate({ path: 'modules', populate: { path: 'lessons' } });

    const effectivenessData = await Promise.all(
      courses.map(async (course) => {
        const instructor = course.trainer || { _id: null, email: 'N/A', profile: {} };

        // Get enrollments
        const enrollments = await Enrollment.find({ course: course._id });
        const totalStudents = enrollments.length;

        const lessonIds = getCourseLessonIds(course);
        const totalLessonsInCourse = lessonIds.length;
        let totalCompletionRateSum = 0;
        for (const enrollment of enrollments) {
          const userId = enrollment.user?._id ?? enrollment.user;
          const enrollmentProgress = enrollment.progress ?? 0;
          if (!userId) {
            totalCompletionRateSum += enrollmentProgress;
            continue;
          }
          if (lessonIds.length === 0) {
            totalCompletionRateSum += enrollmentProgress;
            continue;
          }
          const progress = await LessonProgress.find({
            user: userId,
            lesson: { $in: lessonIds },
          });
          const completed = progress.filter((p) => p.completed).length;
          const computedRate = totalLessonsInCourse > 0 ? (completed / totalLessonsInCourse) * 100 : 0;
          totalCompletionRateSum += Math.max(computedRate, enrollmentProgress);
        }
        const completionRate =
          totalStudents > 0 ? totalCompletionRateSum / totalStudents : 0;

        // QuizAttempt has quiz ref; get attempts for this course's quizzes
        const courseQuizIds = (await Quiz.find({ course: course._id }).select('_id').lean()).map((q) => q._id);
        const quizAttempts = courseQuizIds.length > 0
          ? await QuizAttempt.find({ quiz: { $in: courseQuizIds } })
          : [];
        const averageScore =
          quizAttempts.length > 0
            ? quizAttempts.reduce((sum, attempt) => sum + (attempt.percentage ?? attempt.score ?? 0), 0) /
              quizAttempts.length
            : 0;

        // Get certificates
        const certificates = await Certificate.find({ course: course._id });

        // Get course rating
        const courseRating = course.rating?.average || 0;
        const ratingCount = course.rating?.count || 0;

        // Calculate effectiveness score (0-100)
        const effectivenessScore =
          (completionRate * 0.3 +
            (averageScore / 100) * 0.3 +
            (courseRating / 5) * 0.2 +
            (certificates.length / Math.max(totalStudents, 1)) * 0.2) *
          100;

        return {
          instructor: {
            _id: instructor._id,
            email: instructor.email,
            name: `${instructor.profile?.firstName || ''} ${instructor.profile?.lastName || ''}`.trim(),
          },
          course: {
            _id: course._id,
            title: course.title,
          },
          metrics: {
            totalStudents,
            completionRate: Math.round(completionRate * 100) / 100,
            averageScore: Math.round(averageScore * 100) / 100,
            certificatesIssued: certificates.length,
            courseRating: Math.round(courseRating * 100) / 100,
            ratingCount,
            effectivenessScore: Math.round(effectivenessScore * 100) / 100,
          },
        };
      })
    );

    // Group by instructor
    const instructorStats = {};
    effectivenessData.forEach((data) => {
      const instructorId = data.instructor._id.toString();
      if (!instructorStats[instructorId]) {
        instructorStats[instructorId] = {
          instructor: data.instructor,
          courses: [],
          totalStudents: 0,
          totalCompletionRate: 0,
          totalAverageScore: 0,
          totalCertificates: 0,
          totalRating: 0,
          totalRatingCount: 0,
          totalEffectivenessScore: 0,
        };
      }
      instructorStats[instructorId].courses.push(data.course);
      instructorStats[instructorId].totalStudents += data.metrics.totalStudents;
      instructorStats[instructorId].totalCompletionRate += data.metrics.completionRate;
      instructorStats[instructorId].totalAverageScore += data.metrics.averageScore;
      instructorStats[instructorId].totalCertificates += data.metrics.certificatesIssued;
      instructorStats[instructorId].totalRating += data.metrics.courseRating;
      instructorStats[instructorId].totalRatingCount += data.metrics.ratingCount;
      instructorStats[instructorId].totalEffectivenessScore += data.metrics.effectivenessScore;
    });

    // Calculate averages
    const instructorEffectiveness = Object.values(instructorStats).map((stats) => {
      const courseCount = stats.courses.length;
      return {
        instructor: stats.instructor,
        courseCount,
        metrics: {
          totalStudents: stats.totalStudents,
          averageCompletionRate: Math.round((stats.totalCompletionRate / courseCount) * 100) / 100,
          averageScore: Math.round((stats.totalAverageScore / courseCount) * 100) / 100,
          totalCertificates: stats.totalCertificates,
          averageRating: Math.round((stats.totalRating / courseCount) * 100) / 100,
          totalRatingCount: stats.totalRatingCount,
          averageEffectivenessScore: Math.round((stats.totalEffectivenessScore / courseCount) * 100) / 100,
        },
      };
    });

    res.status(200).json({
      success: true,
      count: instructorEffectiveness.length,
      data: instructorEffectiveness,
    });
  } catch (error) {
    next(error);
  }
};


