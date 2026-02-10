import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  answer: String,
  isCorrect: Boolean,
  points: Number,
  needsManualReview: {
    type: Boolean,
    default: false,
  },
  feedback: String,
});

const quizAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    answers: [answerSchema],
    score: {
      type: Number,
      default: 0,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      default: null,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    requiresManualGrading: {
      type: Boolean,
      default: false,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    gradedAt: Date,
    startTime: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    timeSpent: {
      type: Number, // in minutes
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

export default QuizAttempt;

