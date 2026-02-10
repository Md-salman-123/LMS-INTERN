import Enrollment from '../models/Enrollment.js';
import LessonProgress from '../models/LessonProgress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import { notifyCourseCompletion } from './notificationController.js';
import { updateUserStreak } from '../utils/streak.js';

// @desc    Track lesson viewing time
// @route   POST /api/progress/lessons/:id/track
// @access  Private
export const trackLessonView = async (req, res, next) => {
  try {
    const { timeSpent, progressPercentage } = req.body;
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

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: lesson.module.course._id,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: 'Not enrolled in this course',
      });
    }

    // Update or create lesson progress
    let lessonProgress = await LessonProgress.findOne({
      user: req.user._id,
      lesson: lesson._id,
    });

    if (lessonProgress) {
      lessonProgress.timeSpent = (lessonProgress.timeSpent || 0) + (timeSpent || 0);
      lessonProgress.lastAccessedAt = new Date();
      lessonProgress.viewCount = (lessonProgress.viewCount || 0) + 1;
      if (progressPercentage !== undefined) {
        lessonProgress.progressPercentage = progressPercentage;
        if (progressPercentage === 100 && !lessonProgress.completed) {
          lessonProgress.completed = true;
          lessonProgress.completedAt = new Date();
          await updateUserStreak(req.user._id);
        }
      }
      await lessonProgress.save();
    } else {
      lessonProgress = await LessonProgress.create({
        user: req.user._id,
        lesson: lesson._id,
        timeSpent: timeSpent || 0,
        lastAccessedAt: new Date(),
        viewCount: 1,
        progressPercentage: progressPercentage || 0,
        completed: progressPercentage === 100,
        completedAt: progressPercentage === 100 ? new Date() : null,
      });
      if (progressPercentage === 100) await updateUserStreak(req.user._id);
    }

    // Update enrollment time and last accessed
    enrollment.totalTimeSpent = (enrollment.totalTimeSpent || 0) + (timeSpent || 0);
    enrollment.lastAccessedAt = new Date();
    await enrollment.save();

    res.status(200).json({
      success: true,
      data: lessonProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive course progress
// @route   GET /api/progress/courses/:courseId
// @access  Private
export const getCourseProgress = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId).populate({
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
        error: 'Not enrolled in this course',
      });
    }

    // Get lesson progress
    let totalLessons = 0;
    let completedLessons = 0;
    let totalTimeSpent = 0;
    const lessonProgressDetails = [];

    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        totalLessons++;
        const progress = await LessonProgress.findOne({
          user: req.user._id,
          lesson: lesson._id,
        });

        if (progress) {
          if (progress.completed) completedLessons++;
          totalTimeSpent += progress.timeSpent || 0;
          lessonProgressDetails.push({
            lessonId: lesson._id,
            lessonTitle: lesson.title,
            moduleId: module._id,
            moduleTitle: module.title,
            completed: progress.completed,
            progressPercentage: progress.progressPercentage,
            timeSpent: progress.timeSpent,
            lastAccessedAt: progress.lastAccessedAt,
            viewCount: progress.viewCount,
          });
        } else {
          lessonProgressDetails.push({
            lessonId: lesson._id,
            lessonTitle: lesson.title,
            moduleId: module._id,
            moduleTitle: module.title,
            completed: false,
            progressPercentage: 0,
            timeSpent: 0,
            lastAccessedAt: null,
            viewCount: 0,
          });
        }
      }
    }

    const progressPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Get quiz performance
    const quizAttempts = await QuizAttempt.find({
      user: req.user._id,
      quiz: { $in: [] }, // Will be populated from course quizzes
    });

    const quizScores = quizAttempts.map((attempt) => attempt.percentage);
    const averageQuizScore =
      quizScores.length > 0
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
        : null;

    // Get assignment performance
    const assignmentSubmissions = await AssignmentSubmission.find({
      user: req.user._id,
      assignment: { $in: [] }, // Will be populated from course assignments
      status: 'graded',
    });

    const assignmentScores = assignmentSubmissions.map((sub) => sub.percentage);
    const averageAssignmentScore =
      assignmentScores.length > 0
        ? Math.round(assignmentScores.reduce((a, b) => a + b, 0) / assignmentScores.length)
        : null;

    // Get certificates
    const certificates = await Certificate.find({
      user: req.user._id,
      course: course._id,
    });

    res.status(200).json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: course.title,
        },
        enrollment: {
          status: enrollment.status,
          progress: enrollment.progress,
          enrolledAt: enrollment.enrolledAt,
          lastAccessedAt: enrollment.lastAccessedAt,
          completedAt: enrollment.completedAt,
        },
        progress: {
          totalLessons,
          completedLessons,
          progressPercentage,
          totalTimeSpent: enrollment.totalTimeSpent || totalTimeSpent,
          averageTimePerLesson:
            completedLessons > 0 ? Math.round(totalTimeSpent / completedLessons) : 0,
        },
        performance: {
          averageQuizScore,
          averageAssignmentScore,
          quizzesCompleted: quizAttempts.length,
          assignmentsCompleted: assignmentSubmissions.length,
          certificatesEarned: certificates.length,
        },
        lessonDetails: lessonProgressDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's overall progress across all courses
// @route   GET /api/progress/overview
// @access  Private
export const getProgressOverview = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate('course', 'title description')
      .sort({ lastAccessedAt: -1 });

    const overview = {
      totalCourses: enrollments.length,
      completedCourses: 0,
      inProgressCourses: 0,
      enrolledCourses: 0,
      totalTimeSpent: 0,
      totalLessonsCompleted: 0,
      totalQuizzesCompleted: 0,
      totalAssignmentsCompleted: 0,
      certificatesEarned: 0,
      averageProgress: 0,
      courses: [],
    };

    let totalProgress = 0;

    for (const enrollment of enrollments) {
      if (enrollment.status === 'completed') overview.completedCourses++;
      else if (enrollment.status === 'in_progress') overview.inProgressCourses++;
      else overview.enrolledCourses++;

      overview.totalTimeSpent += enrollment.totalTimeSpent || 0;
      totalProgress += enrollment.progress || 0;

      // Get detailed stats for each course
      const course = enrollment.course;
      const lessonProgresses = await LessonProgress.find({
        user: req.user._id,
        lesson: { $in: [] }, // Will be populated from course lessons
      });

      const courseLessonsCompleted = lessonProgresses.filter((lp) => lp.completed).length;

      overview.courses.push({
        courseId: course._id,
        courseTitle: course.title,
        status: enrollment.status,
        progress: enrollment.progress,
        timeSpent: enrollment.totalTimeSpent || 0,
        lessonsCompleted: courseLessonsCompleted,
        lastAccessedAt: enrollment.lastAccessedAt,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
      });
    }

    overview.averageProgress =
      enrollments.length > 0 ? Math.round(totalProgress / enrollments.length) : 0;

    // Get overall quiz and assignment stats
    const quizAttempts = await QuizAttempt.find({ user: req.user._id });
    overview.totalQuizzesCompleted = quizAttempts.length;

    const assignmentSubmissions = await AssignmentSubmission.find({
      user: req.user._id,
      status: 'graded',
    });
    overview.totalAssignmentsCompleted = assignmentSubmissions.length;

    const certificates = await Certificate.find({ user: req.user._id });
    overview.certificatesEarned = certificates.length;

    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get performance analytics
// @route   GET /api/progress/performance
// @access  Private
export const getPerformanceAnalytics = async (req, res, next) => {
  try {
    const { courseId, startDate, endDate } = req.query;

    let query = { user: req.user._id };
    if (courseId) {
      query.course = courseId;
    }

    // Quiz performance
    const quizAttempts = await QuizAttempt.find(query)
      .populate('quiz', 'title course')
      .sort({ completedAt: -1 });

    const quizPerformance = {
      totalAttempts: quizAttempts.length,
      averageScore: null,
      highestScore: null,
      lowestScore: null,
      passedCount: 0,
      failedCount: 0,
      attempts: quizAttempts.map((attempt) => ({
        quizId: attempt.quiz._id,
        quizTitle: attempt.quiz.title,
        score: attempt.percentage,
        passed: attempt.passed,
        completedAt: attempt.completedAt,
        timeSpent: attempt.timeSpent,
      })),
    };

    if (quizAttempts.length > 0) {
      const scores = quizAttempts.map((a) => a.percentage);
      quizPerformance.averageScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
      quizPerformance.highestScore = Math.max(...scores);
      quizPerformance.lowestScore = Math.min(...scores);
      quizPerformance.passedCount = quizAttempts.filter((a) => a.passed).length;
      quizPerformance.failedCount = quizAttempts.length - quizPerformance.passedCount;
    }

    // Assignment performance
    const assignmentSubmissions = await AssignmentSubmission.find({
      user: req.user._id,
      status: 'graded',
      ...(courseId && { assignment: { $in: [] } }), // Will filter by course assignments
    })
      .populate('assignment', 'title course')
      .sort({ gradedAt: -1 });

    const assignmentPerformance = {
      totalSubmissions: assignmentSubmissions.length,
      averageScore: null,
      highestScore: null,
      lowestScore: null,
      passedCount: 0,
      failedCount: 0,
      submissions: assignmentSubmissions.map((sub) => ({
        assignmentId: sub.assignment._id,
        assignmentTitle: sub.assignment.title,
        score: sub.percentage,
        points: sub.score,
        totalPoints: sub.totalPoints,
        gradedAt: sub.gradedAt,
        isLate: sub.isLate,
      })),
    };

    if (assignmentSubmissions.length > 0) {
      const scores = assignmentSubmissions.map((s) => s.percentage);
      assignmentPerformance.averageScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
      assignmentPerformance.highestScore = Math.max(...scores);
      assignmentPerformance.lowestScore = Math.min(...scores);
      assignmentPerformance.passedCount = assignmentSubmissions.filter(
        (s) => s.percentage >= 70
      ).length;
      assignmentPerformance.failedCount =
        assignmentSubmissions.length - assignmentPerformance.passedCount;
    }

    // Learning activity timeline
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate('course', 'title')
      .sort({ lastAccessedAt: -1 })
      .limit(10);

    const activityTimeline = enrollments.map((enrollment) => ({
      date: enrollment.lastAccessedAt,
      course: enrollment.course.title,
      action: enrollment.status === 'completed' ? 'completed' : 'accessed',
    }));

    res.status(200).json({
      success: true,
      data: {
        quizPerformance,
        assignmentPerformance,
        activityTimeline,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lesson progress (for video/content tracking)
// @route   PUT /api/progress/lessons/:id
// @access  Private
export const updateLessonProgress = async (req, res, next) => {
  try {
    const { progressPercentage, timeSpent } = req.body;
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

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: lesson.module.course._id,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: 'Not enrolled in this course',
      });
    }

    // Update lesson progress
    let lessonProgress = await LessonProgress.findOne({
      user: req.user._id,
      lesson: lesson._id,
    });

    if (lessonProgress) {
      if (progressPercentage !== undefined) {
        lessonProgress.progressPercentage = progressPercentage;
        if (progressPercentage === 100 && !lessonProgress.completed) {
          lessonProgress.completed = true;
          lessonProgress.completedAt = new Date();
        }
      }
      if (timeSpent !== undefined) {
        lessonProgress.timeSpent = timeSpent;
      }
      lessonProgress.lastAccessedAt = new Date();
      await lessonProgress.save();
    } else {
      lessonProgress = await LessonProgress.create({
        user: req.user._id,
        lesson: lesson._id,
        progressPercentage: progressPercentage || 0,
        timeSpent: timeSpent || 0,
        completed: progressPercentage === 100,
        completedAt: progressPercentage === 100 ? new Date() : null,
        lastAccessedAt: new Date(),
        viewCount: 1,
      });
    }

    // Update enrollment last accessed
    enrollment.lastAccessedAt = new Date();

    // If this lesson was just marked complete, recalculate course progress and notify if course is 100%
    if (progressPercentage === 100) {
      await updateUserStreak(req.user._id);
      const course = await Course.findById(lesson.module.course._id).populate({
        path: 'modules',
        populate: { path: 'lessons' },
      });
      let totalLessons = 0;
      let completedCount = 0;
      for (const mod of course.modules || []) {
        for (const les of mod.lessons || []) {
          totalLessons++;
          const lp = await LessonProgress.findOne({
            user: req.user._id,
            lesson: les._id,
            completed: true,
          });
          if (lp) completedCount++;
        }
      }
      const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      enrollment.progress = progressPct;
      if (progressPct === 100 && enrollment.status !== 'completed') {
        enrollment.status = 'completed';
        enrollment.completedAt = new Date();
        await User.findByIdAndUpdate(req.user._id, { $inc: { points: 100 } });
        await notifyCourseCompletion(req.user._id, course?.title, course?._id?.toString());
        // Certificate is issued only when user also passes the course quiz (see quizController)
      }
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


