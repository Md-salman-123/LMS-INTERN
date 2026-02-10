import Enrollment from '../models/Enrollment.js';
import LessonProgress from '../models/LessonProgress.js';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Batch from '../models/Batch.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { notifyCourseCompletion } from './notificationController.js';
import { updateUserStreak } from '../utils/streak.js';

// @desc    Enroll learner to course
// @route   POST /api/enrollments
// @access  Private
export const createEnrollment = async (req, res, next) => {
  try {
    const { userId, courseId, batchId, enrollmentType } = req.body;

    // Determine user and course
    const targetUserId = userId || req.user._id;
    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const course = await Course.findById(courseId).populate('prerequisites');

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    // Check if course is published
    if (course.status !== 'published') {
      return res.status(400).json({
        success: false,
        error: 'Course is not published',
      });
    }

    // Check enrollment type permissions
    const isSelfEnrollment = targetUserId.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);

    // Check if self-enrollment is allowed
    // Allow self-enrollment for: 'self', 'open', 'automatic' enrollment types
    // Block self-enrollment for: 'manual' enrollment type (unless admin)
    const allowedSelfEnrollmentTypes = ['self', 'open', 'automatic'];
    if (isSelfEnrollment && !allowedSelfEnrollmentTypes.includes(course.enrollmentType) && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Self-enrollment is not allowed for this course. Please contact an administrator to enroll you.',
        enrollmentType: course.enrollmentType,
      });
    }

    // Check if admin is enrolling someone else
    if (!isSelfEnrollment && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can enroll other users',
      });
    }

    // Check prerequisites
    if (course.prerequisites && course.prerequisites.length > 0) {
      const prerequisiteCourses = course.prerequisites.map((p) => p._id || p);
      const completedPrerequisites = await Enrollment.find({
        user: targetUserId,
        course: { $in: prerequisiteCourses },
        status: 'completed',
      });

      if (completedPrerequisites.length < prerequisiteCourses.length) {
        const missingPrerequisites = prerequisiteCourses.filter(
          (prereqId) =>
            !completedPrerequisites.some(
              (e) => e.course.toString() === prereqId.toString()
            )
        );

        const missingCourses = await Course.find({ _id: { $in: missingPrerequisites } }).select('title');
        
        return res.status(400).json({
          success: false,
          error: 'Prerequisites not met',
          missingPrerequisites: missingCourses.map((c) => c.title),
        });
      }
    }

    // Check if enrollment already exists
    // For sparse unique index, we need to handle null batch correctly
    const existingEnrollmentQuery = {
      user: targetUserId,
      course: courseId,
    };
    
    if (batchId) {
      existingEnrollmentQuery.batch = batchId;
    } else {
      // For non-batch enrollments, explicitly check for null
      existingEnrollmentQuery.batch = null;
    }
    
    const existingEnrollment = await Enrollment.findOne(existingEnrollmentQuery);

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        error: 'User is already enrolled in this course',
      });
    }

    // Check batch if provided
    let batch = null;
    if (batchId) {
      batch = await Batch.findById(batchId);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found',
        });
      }

      // Check batch capacity
      if (batch.maxCapacity > 0) {
        const currentEnrollments = await Enrollment.countDocuments({ batch: batchId });
        if (currentEnrollments >= batch.maxCapacity) {
          return res.status(400).json({
            success: false,
            error: 'Batch is full',
          });
        }
      }

      // Check batch status
      if (batch.status === 'completed' || batch.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: 'Cannot enroll in this batch',
        });
      }
    }

    // Validate required fields before creating enrollment
    if (!targetUserId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Course ID are required for enrollment',
      });
    }

    // Calculate access duration
    let accessEndDate = null;
    let expiresAt = null;
    if (course.accessDuration > 0) {
      const startDate = new Date();
      accessEndDate = new Date(startDate);
      accessEndDate.setDate(accessEndDate.getDate() + course.accessDuration);
      expiresAt = accessEndDate;
    }

    // Prepare enrollment data - ensure no null values for indexed fields
    const enrollmentData = {
      user: targetUserId,
      course: courseId,
      enrollmentType: enrollmentType || (isSelfEnrollment ? 'self' : 'manual'),
      enrolledBy: isSelfEnrollment ? null : req.user._id,
      accessStartDate: new Date(),
      accessEndDate: accessEndDate || undefined,
      expiresAt: expiresAt || undefined,
    };

    // Only include batch if it's provided (not null/undefined)
    if (batchId) {
      enrollmentData.batch = batchId;
    }

    const enrollment = await Enrollment.create(enrollmentData);

    // Update course enrollment count
    course.enrollmentCount = (course.enrollmentCount || 0) + 1;
    await course.save();

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('user', 'email profile')
      .populate('course', 'title description')
      .populate('batch', 'name');

    res.status(201).json({
      success: true,
      data: populatedEnrollment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user enrollments
// @route   GET /api/enrollments
// @access  Private
export const getEnrollments = async (req, res, next) => {
  try {
    let query = {};

    // Filter by course if provided
    if (req.query.course) {
      query.course = req.query.course;
    }

    // Filter by batch if provided
    if (req.query.batch) {
      query.batch = req.query.batch;
    }

    // If learner/student, can only see own enrollments
    if (req.user.role === 'learner' || req.user.role === 'student') {
      query.user = req.user._id;
    } else if (req.query.user) {
      // Admin/Trainer can filter by user
      query.user = req.query.user;
    }

    // Filter active enrollments by default
    if (req.query.active !== 'false') {
      query.isActive = true;
      query.status = { $ne: 'expired' };
    }

    const enrollments = await Enrollment.find(query)
      .populate('user', 'email profile')
      .populate({
        path: 'course',
        select: 'title description trainer status visibility',
        populate: { path: 'trainer', select: 'email profile' },
      })
      .populate('batch', 'name startDate endDate')
      .populate('enrolledBy', 'email profile')
      .sort({ createdAt: -1 });

    // Filter out enrollments with invalid course references and check access
    const validEnrollments = enrollments
      .filter((e) => e.course && typeof e.course === 'object')
      .map((e) => {
        const enrollmentObj = e.toObject();
        enrollmentObj.hasActiveAccess = e.hasActiveAccess();
        enrollmentObj.isExpired = e.isExpired();
        return enrollmentObj;
      });

    res.status(200).json({
      success: true,
      count: validEnrollments.length,
      data: validEnrollments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update enrollment (suspend, reactivate, extend access)
// @route   PUT /api/enrollments/:id
// @access  Private/Admin
export const updateEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found',
      });
    }

    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update enrollment',
      });
    }

    if (req.user.role === 'admin' && req.user.organization) {
      const course = await Course.findById(enrollment.course).select('organization');
      if (!course || course.organization?.toString() !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Cannot update enrollments for courses in other organizations',
        });
      }
    }

    const { status, isActive, accessEndDate, expiresAt, extendDays } = req.body;

    if (status) enrollment.status = status;
    if (isActive !== undefined) enrollment.isActive = isActive;

    // Extend access duration
    if (extendDays && extendDays > 0) {
      const currentEndDate = enrollment.accessEndDate || enrollment.expiresAt || new Date();
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + extendDays);
      enrollment.accessEndDate = newEndDate;
      enrollment.expiresAt = newEndDate;
    }

    if (accessEndDate) enrollment.accessEndDate = new Date(accessEndDate);
    if (expiresAt) enrollment.expiresAt = new Date(expiresAt);

    await enrollment.save();

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('user', 'email profile')
      .populate('course', 'title description')
      .populate('batch', 'name');

    res.status(200).json({
      success: true,
      data: populatedEnrollment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete enrollment
// @route   DELETE /api/enrollments/:id
// @access  Private/Admin
export const deleteEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id).populate('course');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found',
      });
    }

    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete enrollment',
      });
    }

    if (req.user.role === 'admin' && req.user.organization) {
      const c = await Course.findById(enrollment.course).select('organization');
      if (!c || c.organization?.toString() !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete enrollments for courses in other organizations',
        });
      }
    }

    await enrollment.deleteOne();

    // Update course enrollment count
    if (enrollment.course) {
      enrollment.course.enrollmentCount = Math.max(0, (enrollment.course.enrollmentCount || 1) - 1);
      await enrollment.course.save();
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enrollment progress
// @route   GET /api/enrollments/:id/progress
// @access  Private
export const getEnrollmentProgress = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('user', 'email profile')
      .populate({
        path: 'course',
        populate: {
          path: 'modules',
          populate: { path: 'lessons' },
        },
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found',
      });
    }

    // Check access
    if (!enrollment.hasActiveAccess()) {
      return res.status(403).json({
        success: false,
        error: 'Enrollment access has expired',
      });
    }

    // Calculate progress
    let totalLessons = 0;
    let completedLessons = 0;

    for (const module of enrollment.course.modules) {
      totalLessons += module.lessons.length;
      for (const lesson of module.lessons) {
        const progress = await LessonProgress.findOne({
          user: enrollment.user._id,
          lesson: lesson._id,
          completed: true,
        });
        if (progress) completedLessons++;
      }
    }

    const progressPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    enrollment.progress = progressPercentage;
    if (progressPercentage === 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      await enrollment.save();

      // Notify user of course completion (e.g. when progress was completed via progress API)
      const courseForNotif = await Course.findById(enrollment.course).select('title').lean();
      await notifyCourseCompletion(
        enrollment.user._id ?? enrollment.user,
        courseForNotif?.title,
        enrollment.course?.toString?.() ?? enrollment.course?._id?.toString()
      );

      // Certificate is issued only when user also passes the course quiz (see quizController)
    } else if (progressPercentage > 0 && enrollment.status === 'enrolled') {
      enrollment.status = 'in_progress';
      await enrollment.save();
    }

    res.status(200).json({
      success: true,
      data: {
        enrollment,
        totalLessons,
        completedLessons,
        progressPercentage,
        hasActiveAccess: enrollment.hasActiveAccess(),
        expiresAt: enrollment.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark lesson as complete
// @route   POST /api/lessons/:id/complete
// @access  Private
export const completeLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate({
      path: 'module',
      populate: { path: 'course' },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
      });
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: lesson.module.course._id,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: 'You are not enrolled in this course',
      });
    }

    // Check access
    if (!enrollment.hasActiveAccess()) {
      return res.status(403).json({
        success: false,
        error: 'Your enrollment access has expired',
      });
    }

    // Create or update lesson progress
    let lessonProgress = await LessonProgress.findOne({
      user: req.user._id,
      lesson: lesson._id,
    });

    if (lessonProgress) {
      lessonProgress.completed = true;
      lessonProgress.completedAt = new Date();
      await lessonProgress.save();
    } else {
      lessonProgress = await LessonProgress.create({
        user: req.user._id,
        lesson: lesson._id,
        completed: true,
        completedAt: new Date(),
      });
    }

    await updateUserStreak(req.user._id);

    // Update enrollment progress
    const course = await Course.findById(lesson.module.course._id).populate({
      path: 'modules',
      populate: { path: 'lessons' },
    });

    let totalLessons = 0;
    let completedLessons = 0;

    for (const module of course.modules) {
      totalLessons += module.lessons.length;
      for (const lessonItem of module.lessons) {
        const progress = await LessonProgress.findOne({
          user: req.user._id,
          lesson: lessonItem._id,
          completed: true,
        });
        if (progress) completedLessons++;
      }
    }

    const progressPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    enrollment.progress = progressPercentage;
    const lessonMinutes = lesson.duration && lesson.duration > 0 ? lesson.duration : 5;
    enrollment.totalTimeSpent = (enrollment.totalTimeSpent || 0) + lessonMinutes;
    if (progressPercentage === 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      // Award leaderboard points for course completion
      const POINTS_PER_COURSE = 100;
      await User.findByIdAndUpdate(req.user._id, { $inc: { points: POINTS_PER_COURSE } });
      // Notify user of course completion
      await notifyCourseCompletion(req.user._id, course?.title, course?._id?.toString());
      // Certificate is issued only when user also passes the course quiz (see quizController)
    } else if (progressPercentage > 0) {
      enrollment.status = 'in_progress';
    }
    await enrollment.save();

    res.status(200).json({
      success: true,
      data: lessonProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course progress for learner
// @route   GET /api/courses/:id/progress
// @access  Private
export const getCourseProgress = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate({
      path: 'modules',
      populate: { path: 'lessons' },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course._id,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: 'You are not enrolled in this course',
      });
    }

    // Check access
    if (!enrollment.hasActiveAccess()) {
      return res.status(403).json({
        success: false,
        error: 'Your enrollment access has expired',
        expiresAt: enrollment.expiresAt,
      });
    }

    let totalLessons = 0;
    let completedLessons = 0;
    const lessonProgressMap = {};

    for (const module of course.modules) {
      totalLessons += module.lessons.length;
      for (const lesson of module.lessons) {
        const progress = await LessonProgress.findOne({
          user: req.user._id,
          lesson: lesson._id,
        });
        if (progress && progress.completed) {
          completedLessons++;
        }
        lessonProgressMap[lesson._id] = progress || { completed: false };
      }
    }

    const progressPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        course,
        enrollment,
        totalLessons,
        completedLessons,
        progressPercentage,
        lessonProgressMap,
        hasActiveAccess: enrollment.hasActiveAccess(),
        expiresAt: enrollment.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check course enrollment eligibility
// @route   GET /api/courses/:id/eligibility
// @access  Private
export const checkEligibility = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('prerequisites');

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course._id,
    });

    if (existingEnrollment) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          reason: 'already_enrolled',
          enrollment: existingEnrollment,
        },
      });
    }

    // Check prerequisites
    let prerequisitesMet = true;
    const missingPrerequisites = [];

    if (course.prerequisites && course.prerequisites.length > 0) {
      const prerequisiteCourses = course.prerequisites.map((p) => p._id || p);
      const completedPrerequisites = await Enrollment.find({
        user: req.user._id,
        course: { $in: prerequisiteCourses },
        status: 'completed',
      });

      for (const prereqId of prerequisiteCourses) {
        const completed = completedPrerequisites.some(
          (e) => e.course.toString() === prereqId.toString()
        );
        if (!completed) {
          prerequisitesMet = false;
          const prereqCourse = await Course.findById(prereqId).select('title');
          if (prereqCourse) {
            missingPrerequisites.push(prereqCourse.title);
          }
        }
      }
    }

    // Check if self-enrollment is allowed
    const allowedSelfEnrollmentTypes = ['self', 'open', 'automatic'];
    const canSelfEnroll = allowedSelfEnrollmentTypes.includes(course.enrollmentType);

    res.status(200).json({
      success: true,
      data: {
        eligible: prerequisitesMet && course.status === 'published',
        prerequisitesMet,
        missingPrerequisites,
        enrollmentType: course.enrollmentType,
        canSelfEnroll,
      },
    });
  } catch (error) {
    next(error);
  }
};
