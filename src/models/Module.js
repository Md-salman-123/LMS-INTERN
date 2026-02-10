import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a module title'],
      trim: true,
    },
    description: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    lessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
      },
    ],
    // Content scheduling (drip learning)
    releaseDate: {
      type: Date,
      default: Date.now,
    },
    releaseAfterDays: {
      type: Number,
      default: 0, // 0 means available immediately
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    unlockDate: Date,
    // Optional quiz for this module (student takes after finishing module lessons)
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
    },
  },
  {
    timestamps: true,
  }
);

const Module = mongoose.model('Module', moduleSchema);

export default Module;

