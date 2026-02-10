import mongoose from 'mongoose';

const lessonProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
    timeSpent: {
      type: Number, // in minutes
      default: 0,
    },
    // Detailed tracking
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    // Progress percentage (for partial completion)
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Time tracking per session
    sessions: [
      {
        startTime: Date,
        endTime: Date,
        duration: Number, // in minutes
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate progress entries
lessonProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });

const LessonProgress = mongoose.model('LessonProgress', lessonProgressSchema);

export default LessonProgress;

