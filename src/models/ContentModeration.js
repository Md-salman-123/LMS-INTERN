import mongoose from 'mongoose';

const contentModerationSchema = new mongoose.Schema(
  {
    // Content type
    contentType: {
      type: String,
      enum: ['course', 'lesson', 'discussion', 'comment', 'announcement'],
      required: true,
    },
    // Related content
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Reporter
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Reason
    reason: {
      type: String,
      enum: [
        'spam',
        'inappropriate',
        'copyright',
        'misinformation',
        'harassment',
        'other',
      ],
      required: true,
    },
    description: String,
    // Status
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'approved', 'rejected', 'removed'],
      default: 'pending',
    },
    // Moderator
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    // Actions taken
    action: {
      type: String,
      enum: ['none', 'warn', 'edit', 'hide', 'remove', 'ban'],
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
contentModerationSchema.index({ contentType: 1, contentId: 1 });
contentModerationSchema.index({ status: 1, createdAt: -1 });
contentModerationSchema.index({ reportedBy: 1 });

const ContentModeration = mongoose.model('ContentModeration', contentModerationSchema);

export default ContentModeration;


