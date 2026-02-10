import mongoose from 'mongoose';

const threadSchema = new mongoose.Schema(
  {
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a thread title'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide thread content'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['doubt', 'question', 'clarification', 'general'],
      default: 'doubt',
    },
    status: {
      type: String,
      enum: ['open', 'answered', 'resolved', 'closed'],
      default: 'open',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    tags: [String],
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
threadSchema.index({ discussion: 1, createdAt: -1 });
threadSchema.index({ author: 1 });
threadSchema.index({ status: 1 });
threadSchema.index({ type: 1 });

const Thread = mongoose.model('Thread', threadSchema);

export default Thread;


