import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide an announcement title'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide announcement content'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    scheduledAt: Date, // For scheduled announcements
    expiresAt: Date, // Optional expiration date
    attachments: [
      {
        url: String,
        name: String,
        mimeType: String,
        size: Number,
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
announcementSchema.index({ course: 1, createdAt: -1 });
announcementSchema.index({ author: 1 });
announcementSchema.index({ isPinned: -1, createdAt: -1 });
announcementSchema.index({ scheduledAt: 1 });
announcementSchema.index({ expiresAt: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;


