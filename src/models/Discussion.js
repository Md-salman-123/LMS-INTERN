import mongoose from 'mongoose';

const discussionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a discussion title'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide discussion content'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['general', 'question', 'doubt', 'feedback', 'announcement'],
      default: 'general',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
discussionSchema.index({ course: 1, createdAt: -1 });
discussionSchema.index({ author: 1 });
discussionSchema.index({ category: 1 });
discussionSchema.index({ isPinned: -1, createdAt: -1 });

const Discussion = mongoose.model('Discussion', discussionSchema);

export default Discussion;


