import mongoose from 'mongoose';

const learningPathEnrollmentSchema = new mongoose.Schema(
  {
    learningPath: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Progress tracking
    currentCourseIndex: {
      type: Number,
      default: 0, // Index in the courses array
    },
    completedCourses: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
        },
        completedAt: Date,
        progress: Number, // 0-100
      },
    ],
    // Overall progress
    progress: {
      type: Number,
      default: 0, // 0-100
    },
    // Status
    status: {
      type: String,
      enum: ['enrolled', 'in_progress', 'completed', 'paused'],
      default: 'enrolled',
    },
    // Dates
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: Date,
    completedAt: Date,
    // Last accessed
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
learningPathEnrollmentSchema.index({ learningPath: 1, user: 1 }, { unique: true });
learningPathEnrollmentSchema.index({ user: 1, status: 1 });
learningPathEnrollmentSchema.index({ learningPath: 1, status: 1 });

const LearningPathEnrollment = mongoose.model('LearningPathEnrollment', learningPathEnrollmentSchema);

export default LearningPathEnrollment;


