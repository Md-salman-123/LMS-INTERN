import mongoose from 'mongoose';

const recordingSchema = new mongoose.Schema(
  {
    liveClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveClass',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    // Recording file information
    fileUrl: String,
    fileSize: Number, // in bytes
    duration: {
      type: Number, // in minutes
      required: true,
    },
    format: {
      type: String,
      enum: ['mp4', 'webm', 'mkv', 'zoom', 'other'],
      default: 'mp4',
    },
    // Platform-specific recording ID (e.g., Zoom recording ID)
    platformRecordingId: String,
    // Thumbnail
    thumbnailUrl: String,
    // Status
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed', 'deleted'],
      default: 'processing',
    },
    // Access control
    isPublic: {
      type: Boolean,
      default: false,
    },
    // View tracking
    views: {
      type: Number,
      default: 0,
    },
    // Metadata
    recordedAt: {
      type: Date,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
recordingSchema.index({ liveClass: 1, createdAt: -1 });
recordingSchema.index({ status: 1 });
recordingSchema.index({ isPublic: 1 });

const Recording = mongoose.model('Recording', recordingSchema);

export default Recording;


