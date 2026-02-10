import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    // Can be attached to discussions, lessons, or announcements
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment', // For nested replies
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide comment content'],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isResolved: {
      type: Boolean,
      default: false, // For doubt clearing - mark as resolved
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
commentSchema.index({ discussion: 1, createdAt: 1 });
commentSchema.index({ lesson: 1, createdAt: 1 });
commentSchema.index({ announcement: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ author: 1 });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;


