import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema({
  testCaseId: mongoose.Schema.Types.ObjectId,
  passed: Boolean,
  input: String,
  expectedOutput: String,
  actualOutput: String,
  error: String,
  executionTime: Number, // in milliseconds
  memoryUsed: Number, // in bytes
});

const codingLabSubmissionSchema = new mongoose.Schema(
  {
    codingLab: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingLab',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Submission code
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    // Test results
    testResults: [testResultSchema],
    // Overall result
    status: {
      type: String,
      enum: ['pending', 'running', 'passed', 'failed', 'error', 'timeout'],
      default: 'pending',
    },
    // Score
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
    // Execution details
    executionTime: Number, // in milliseconds
    memoryUsed: Number, // in bytes
    errorMessage: String,
    // Attempt number
    attemptNumber: {
      type: Number,
      default: 1,
    },
    // Time taken
    timeTaken: Number, // in seconds
  },
  {
    timestamps: true,
  }
);

// Indexes
codingLabSubmissionSchema.index({ codingLab: 1, user: 1 });
codingLabSubmissionSchema.index({ user: 1, createdAt: -1 });
codingLabSubmissionSchema.index({ status: 1 });

const CodingLabSubmission = mongoose.model('CodingLabSubmission', codingLabSubmissionSchema);

export default CodingLabSubmission;


