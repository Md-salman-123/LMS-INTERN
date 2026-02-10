import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'true_false', 'short_answer'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  options: [String], // For MCQ
  correctAnswer: {
    type: String,
    required: true,
  },
  // For short answer questions - accepted answers (case-insensitive matching)
  acceptedAnswers: [String],
  // For manual evaluation
  requiresManualGrading: {
    type: Boolean,
    default: false,
  },
  points: {
    type: Number,
    default: 1,
  },
  explanation: String, // Explanation shown after submission
});

const quizSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a quiz title'],
      trim: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['quiz', 'exam', 'assignment'],
      default: 'quiz',
    },
    passingScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    questions: [questionSchema],
    timeLimit: {
      type: Number, // in minutes
      default: 0, // 0 means no time limit
    },
    // Timed exam settings
    startDate: Date, // When exam becomes available
    endDate: Date, // When exam closes
    allowMultipleAttempts: {
      type: Boolean,
      default: false,
    },
    maxAttempts: {
      type: Number,
      default: 1,
    },
    // Evaluation settings
    autoGrade: {
      type: Boolean,
      default: true, // Auto-grade MCQ and true/false
    },
    showResults: {
      type: Boolean,
      default: true, // Show results immediately after submission
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true, // Show correct answers after submission
    },
    // Assignment-specific fields
    dueDate: Date,
    allowLateSubmission: {
      type: Boolean,
      default: false,
    },
    latePenalty: {
      type: Number, // Percentage penalty per day
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;

