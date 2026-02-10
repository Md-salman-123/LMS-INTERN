import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true,
  },
  expectedOutput: {
    type: String,
    required: true,
  },
  isHidden: {
    type: Boolean,
    default: false, // Hidden test cases for evaluation
  },
  points: {
    type: Number,
    default: 1,
  },
});

const codingLabSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a lab title'],
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    problemStatement: {
      type: String,
      required: true,
    },
    // Course/Lesson association
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    // Coding environment settings
    language: {
      type: String,
      enum: ['javascript', 'python', 'java', 'cpp', 'c', 'html', 'css', 'sql'],
      default: 'javascript',
    },
    starterCode: {
      type: String,
      default: '',
    },
    solution: {
      type: String,
      default: '',
    },
    // Test cases
    testCases: [testCaseSchema],
    // Constraints and hints
    constraints: [String],
    hints: [String],
    // Difficulty and points
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    points: {
      type: Number,
      default: 10,
    },
    // Time limit (in minutes, 0 = no limit)
    timeLimit: {
      type: Number,
      default: 0,
    },
    // Submission settings
    allowMultipleSubmissions: {
      type: Boolean,
      default: true,
    },
    showSolution: {
      type: Boolean,
      default: false, // Show solution after completion
    },
    // Status
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
codingLabSchema.index({ course: 1, lesson: 1 });
codingLabSchema.index({ language: 1, difficulty: 1 });
codingLabSchema.index({ status: 1 });

const CodingLab = mongoose.model('CodingLab', codingLabSchema);

export default CodingLab;


