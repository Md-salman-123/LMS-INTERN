import Enrollment from '../models/Enrollment.js';
import QuizAttempt from '../models/QuizAttempt.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';

/**
 * Update enrollment performance metrics after quiz completion
 */
export const updateEnrollmentAfterQuiz = async (userId, courseId) => {
  try {
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) return;

    // Get all quiz attempts for this course
    const quizAttempts = await QuizAttempt.find({
      user: userId,
      quiz: { $in: [] }, // Will be populated from course quizzes
    }).populate({
      path: 'quiz',
      match: { course: courseId },
    });

    const validAttempts = quizAttempts.filter((attempt) => attempt.quiz);

    if (validAttempts.length > 0) {
      const scores = validAttempts.map((attempt) => attempt.percentage);
      enrollment.averageQuizScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
      enrollment.quizzesCompleted = validAttempts.length;
    }

    await enrollment.save();
  } catch (error) {
    console.error('Error updating enrollment after quiz:', error);
  }
};

/**
 * Update enrollment performance metrics after assignment grading
 */
export const updateEnrollmentAfterAssignment = async (userId, courseId) => {
  try {
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) return;

    // Get all graded assignment submissions for this course
    const submissions = await AssignmentSubmission.find({
      user: userId,
      status: 'graded',
      assignment: { $in: [] }, // Will be populated from course assignments
    }).populate({
      path: 'assignment',
      match: { course: courseId },
    });

    const validSubmissions = submissions.filter((sub) => sub.assignment);

    if (validSubmissions.length > 0) {
      const scores = validSubmissions.map((sub) => sub.percentage);
      enrollment.averageAssignmentScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
      enrollment.assignmentsCompleted = validSubmissions.length;
    }

    await enrollment.save();
  } catch (error) {
    console.error('Error updating enrollment after assignment:', error);
  }
};

/**
 * Update enrollment time spent from lesson progress
 */
export const updateEnrollmentTimeSpent = async (userId, courseId) => {
  try {
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) return;

    // This will be calculated from lesson progress
    // The progress controller handles this
  } catch (error) {
    console.error('Error updating enrollment time spent:', error);
  }
};


