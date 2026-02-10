import mongoose from 'mongoose';

const submissionFileSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['file', 'link'],
    required: true,
  },
  url: String,
  name: String,
  size: Number,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submissionFiles: [submissionFileSchema],
    textSubmission: String, // For text/code submissions
    submissionLanguage: String, // e.g. 'javascript', 'python' for code submissions
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    // Grading
    score: {
      type: Number,
      default: null,
    },
    totalPoints: {
      type: Number,
      default: null,
    },
    percentage: {
      type: Number,
      default: null,
    },
    grade: String, // Letter grade if applicable
    feedback: String,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    gradedAt: Date,
    status: {
      type: String,
      enum: ['submitted', 'graded', 'returned', 'resubmitted'],
      default: 'submitted',
    },
    // Late submission tracking
    isLate: {
      type: Boolean,
      default: false,
    },
    daysLate: {
      type: Number,
      default: 0,
    },
    latePenalty: {
      type: Number,
      default: 0,
    },
    // Resubmission tracking
    attemptNumber: {
      type: Number,
      default: 1,
    },
    previousSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssignmentSubmission',
    },
    testResults: [
      {
        testCaseId: mongoose.Schema.Types.Mixed,
        passed: Boolean,
        input: String,
        expectedOutput: String,
        actualOutput: String,
        error: String,
      },
    ],
    testsPassed: { type: Number, default: null },
    testsTotal: { type: Number, default: null },
    allTestsPassed: { type: Boolean, default: null },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate submissions (user + assignment + attempt)
assignmentSubmissionSchema.index({ user: 1, assignment: 1, attemptNumber: 1 }, { unique: true });

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);

export default AssignmentSubmission;


