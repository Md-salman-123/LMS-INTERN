import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['file', 'link', 'video', 'pdf', 'ppt', 'document'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number, // in bytes
    default: 0,
  },
  mimeType: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const versionSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true,
  },
  title: String,
  content: String,
  type: String,
  resources: [resourceSchema],
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  changeNote: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a lesson title'],
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'video', 'pdf', 'ppt', 'link', 'document', 'mixed'],
      default: 'text',
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    resources: [resourceSchema],
    duration: {
      type: Number, // in minutes
      default: 0,
    },
    // Direct video link (YouTube / MP4 URL) – when set, used for video lessons instead of resources
    videoUrl: {
      type: String,
      trim: true,
      default: null,
    },
    videoType: {
      type: String,
      enum: ['youtube', 'mp4', 'vimeo'],
      default: null,
    },
    // Version control
    currentVersion: {
      type: Number,
      default: 1,
    },
    versions: [versionSchema],
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
  },
  {
    timestamps: true,
  }
);

// Index for scheduling queries
lessonSchema.index({ module: 1, order: 1 });
lessonSchema.index({ releaseDate: 1, unlockDate: 1 });

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;

