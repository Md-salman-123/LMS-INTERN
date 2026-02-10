import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { updateEnrollmentAfterQuiz } from '../utils/updateEnrollmentMetrics.js';

/** Convert percentage (0–100) to letter grade for admin/display. */
function percentageToLetterGrade(percentage) {
  if (percentage == null || Number.isNaN(percentage)) return null;
  const p = Number(percentage);
  if (p >= 90) return 'A';
  if (p >= 80) return 'B';
  if (p >= 70) return 'C';
  if (p >= 60) return 'D';
  return 'F';
}

// Issue certificate only when user has 100% course completion AND passed the quiz
async function issueCertificateIfPassed(userId, courseId, metadata = {}) {
  try {
    const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
    if (!enrollment || enrollment.status !== 'completed') {
      return; // Certificate only when course is 100% complete and quiz passed
    }
    const { generateCertificate } = await import('../services/certificateService.js');
    const course = await Course.findById(courseId).select('certificateTemplate').lean();
    await generateCertificate(userId, courseId, course?.certificateTemplate || null, metadata);
  } catch (err) {
    console.error('Certificate generation after quiz pass:', err.message);
  }
}

// @desc    Create quiz
// @route   POST /api/quizzes
// @access  Private/Trainer
export const createQuiz = async (req, res, next) => {
  try {
    const {
      course,
      title,
      description,
      type,
      passingScore,
      questions,
      timeLimit,
      startDate,
      endDate,
      allowMultipleAttempts,
      maxAttempts,
      autoGrade,
      showResults,
      showCorrectAnswers,
      dueDate,
      allowLateSubmission,
      latePenalty,
      status,
    } = req.body;

    // Verify course ownership
    const courseDoc = await Course.findById(course);
    if (
      courseDoc.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create quiz for this course',
      });
    }

    const quiz = await Quiz.create({
      course,
      title,
      description,
      type: type || 'quiz',
      passingScore: passingScore || 70,
      questions: questions || [],
      timeLimit: timeLimit || 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      allowMultipleAttempts: allowMultipleAttempts || false,
      maxAttempts: maxAttempts || 1,
      autoGrade: autoGrade !== undefined ? autoGrade : true,
      showResults: showResults !== undefined ? showResults : true,
      showCorrectAnswers: showCorrectAnswers !== undefined ? showCorrectAnswers : true,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      allowLateSubmission: allowLateSubmission || false,
      latePenalty: latePenalty || 0,
      status: status || 'draft',
    });

    res.status(201).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quizzes for a course
// @route   GET /api/quizzes/course/:courseId
// @access  Private
export const getCourseQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ course: req.params.courseId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quiz details
// @route   GET /api/quizzes/:id
// @access  Private
export const getQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('course', 'title');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found',
      });
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start quiz attempt (for timed exams)
// @route   POST /api/quizzes/:id/start
// @access  Private
export const startQuizAttempt = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found',
      });
    }

    // Check if quiz is available
    const now = new Date();
    if (quiz.startDate && now < new Date(quiz.startDate)) {
      return res.status(400).json({
        success: false,
        error: 'Quiz is not available yet',
      });
    }

    if (quiz.endDate && now > new Date(quiz.endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Quiz has closed',
      });
    }

    // Check attempt limits
    if (!quiz.allowMultipleAttempts) {
      const existingAttempt = await QuizAttempt.findOne({
        user: req.user._id,
        quiz: quiz._id,
      });

      if (existingAttempt) {
        return res.status(400).json({
          success: false,
          error: 'You have already attempted this quiz',
        });
      }
    } else {
      const attemptCount = await QuizAttempt.countDocuments({
        user: req.user._id,
        quiz: quiz._id,
      });

      if (attemptCount >= quiz.maxAttempts) {
        return res.status(400).json({
          success: false,
          error: `Maximum attempts (${quiz.maxAttempts}) reached`,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        quiz,
        startTime: now,
        timeLimit: quiz.timeLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/attempt
// @access  Private
export const submitQuizAttempt = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found',
      });
    }

    // If user already passed, do not allow another attempt — review only
    const passedAttempt = await QuizAttempt.findOne({
      user: req.user._id,
      quiz: quiz._id,
      passed: true,
    }).sort({ completedAt: -1 });

    if (passedAttempt) {
      return res.status(403).json({
        success: false,
        error: 'You have already passed this quiz. You can only review your results.',
        attemptId: passedAttempt._id,
      });
    }

    // Check if quiz is still available
    const now = new Date();
    if (quiz.endDate && now > new Date(quiz.endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Quiz has closed',
      });
    }

    const { answers, timeSpent, startTime } = req.body;

    // Calculate score with auto/manual grading
    let score = 0;
    let totalPoints = 0;
    let requiresManualGrading = false;
    const evaluatedAnswers = [];

    for (const question of quiz.questions) {
      totalPoints += question.points || 1;
      const userAnswer = answers.find(
        (a) => a.questionId.toString() === question._id.toString()
      );

      if (userAnswer) {
        let isCorrect = false;
        let points = 0;
        let needsManualReview = false;

        // Auto-grade MCQ and true/false
        if (question.type === 'mcq' || question.type === 'true_false') {
          isCorrect = userAnswer.answer === question.correctAnswer;
          points = isCorrect ? question.points || 1 : 0;
        }
        // Auto-grade short answer (if accepted answers provided)
        else if (question.type === 'short_answer') {
          if (question.requiresManualGrading) {
            needsManualReview = true;
            requiresManualGrading = true;
            points = 0; // Will be graded manually
          } else if (question.acceptedAnswers && question.acceptedAnswers.length > 0) {
            // Case-insensitive matching against accepted answers
            const normalizedUserAnswer = userAnswer.answer.trim().toLowerCase();
            isCorrect = question.acceptedAnswers.some(
              (accepted) => accepted.trim().toLowerCase() === normalizedUserAnswer
            );
            points = isCorrect ? question.points || 1 : 0;
          } else {
            // No accepted answers - requires manual grading
            needsManualReview = true;
            requiresManualGrading = true;
            points = 0;
          }
        }

        evaluatedAnswers.push({
          questionId: question._id,
          answer: userAnswer.answer,
          isCorrect: isCorrect && !needsManualReview,
          points,
          needsManualReview,
        });

        score += points;
      } else {
        evaluatedAnswers.push({
          questionId: question._id,
          answer: '',
          isCorrect: false,
          points: 0,
          needsManualReview: false,
        });
      }
    }

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= quiz.passingScore;
    const grade = requiresManualGrading ? null : percentageToLetterGrade(percentage);

    const attempt = await QuizAttempt.create({
      user: req.user._id,
      quiz: quiz._id,
      answers: evaluatedAnswers,
      score,
      totalPoints,
      percentage,
      grade,
      passed: requiresManualGrading ? null : passed, // null if needs manual grading
      completedAt: new Date(),
      timeSpent: timeSpent || 0,
      requiresManualGrading,
      startTime: startTime ? new Date(startTime) : new Date(),
    });

    // Update enrollment performance metrics
    if (!requiresManualGrading) {
      await updateEnrollmentAfterQuiz(req.user._id, quiz.course);
    }

    // Issue certificate to all who pass the quiz (one per user per course; existing cert is reused)
    if (passed && !requiresManualGrading) {
      await issueCertificateIfPassed(req.user._id, quiz.course, {
        completionDate: new Date(),
        score: percentage,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...attempt.toObject(),
        requiresManualGrading,
        autoGraded: !requiresManualGrading,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grade quiz attempt manually
// @route   PUT /api/quizzes/:id/attempts/:attemptId/grade
// @access  Private/Trainer/Admin
export const gradeQuizAttempt = async (req, res, next) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId).populate('quiz');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found',
      });
    }

    // Check authorization
    if (!['super_admin', 'admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to grade attempts',
      });
    }

    const { grades } = req.body; // Array of { questionId, points, feedback }

    // Update manual grades
    let newScore = attempt.score || 0;
    for (const grade of grades) {
      const answerIndex = attempt.answers.findIndex(
        (a) => a.questionId.toString() === grade.questionId
      );
      if (answerIndex !== -1) {
        const oldPoints = attempt.answers[answerIndex].points || 0;
        newScore = newScore - oldPoints + grade.points;
        attempt.answers[answerIndex].points = grade.points;
        attempt.answers[answerIndex].isCorrect = grade.points > 0;
        attempt.answers[answerIndex].needsManualReview = false;
        if (grade.feedback) {
          attempt.answers[answerIndex].feedback = grade.feedback;
        }
      }
    }

    attempt.score = newScore;
    attempt.percentage = attempt.totalPoints > 0 ? Math.round((newScore / attempt.totalPoints) * 100) : 0;
    attempt.grade = percentageToLetterGrade(attempt.percentage);
    attempt.passed = attempt.percentage >= attempt.quiz.passingScore;
    attempt.requiresManualGrading = false;
    attempt.gradedBy = req.user._id;
    attempt.gradedAt = new Date();

    await attempt.save();

    // Update enrollment performance metrics after manual grading
    await updateEnrollmentAfterQuiz(attempt.user, attempt.quiz.course);

    // Issue certificate when manual grading results in a pass
    if (attempt.passed) {
      const userId = attempt.user._id || attempt.user;
      const courseId = attempt.quiz.course?._id || attempt.quiz.course;
      if (userId && courseId) {
        await issueCertificateIfPassed(userId, courseId, {
          completionDate: new Date(),
          score: attempt.percentage,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user quiz attempts
// @route   GET /api/quizzes/:id/attempts
// @access  Private
export const getQuizAttempts = async (req, res, next) => {
  try {
    const query = { quiz: req.params.id };

    // Only staff see all attempts; learners/students see only their own
    const isStaff = ['super_admin', 'admin', 'trainer', 'instructor'].includes(req.user.role);
    if (!isStaff) {
      query.user = req.user._id;
    }

    const attempts = await QuizAttempt.find(query)
      .populate('user', 'email profile')
      .sort({ createdAt: -1 })
      .lean();

    // Ensure every attempt has a grade for admin grade view (compute from percentage if missing)
    const data = attempts.map((a) => {
      let pct = a.percentage;
      if (pct == null && a.totalPoints > 0 && a.score != null) {
        pct = Math.round((Number(a.score) / Number(a.totalPoints)) * 100);
      }
      const grade = a.grade != null && a.grade !== '' ? a.grade : percentageToLetterGrade(pct);
      return { ...a, percentage: pct ?? a.percentage, grade };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's all quiz attempts (for Grades page)
// @route   GET /api/quizzes/my-attempts
// @access  Private
export const getMyQuizAttempts = async (req, res, next) => {
  try {
    const attempts = await QuizAttempt.find({ user: req.user._id })
      .populate({ path: 'quiz', populate: { path: 'course', select: 'title' } })
      .sort({ completedAt: -1 })
      .lean();

    const data = attempts.map((a) => {
      let pct = a.percentage;
      if (pct == null && a.totalPoints > 0 && a.score != null) {
        pct = Math.round((Number(a.score) / Number(a.totalPoints)) * 100);
      }
      const grade = a.grade != null && a.grade !== '' ? a.grade : percentageToLetterGrade(pct);
      return { ...a, percentage: pct ?? a.percentage, grade };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quiz attempt results
// @route   GET /api/quizzes/:id/results/:attemptId
// @access  Private
export const getQuizResults = async (req, res, next) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('user', 'email profile')
      .populate({
        path: 'quiz',
        populate: { path: 'course', select: 'title' },
      });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found',
      });
    }

    // Check authorization
    if (
      attempt.user._id.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin', 'trainer'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this attempt',
      });
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};

