import mongoose from 'mongoose';

const liveClassSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a class title'],
      trim: true,
    },
    description: String,
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Scheduling
    scheduledStart: {
      type: Date,
      required: true,
    },
    scheduledEnd: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    // Video platform integration
    platform: {
      type: String,
      enum: ['zoom', 'webrtc', 'google_meet', 'microsoft_teams', 'custom'],
      default: 'webrtc',
    },
    // Zoom integration fields
    zoomMeetingId: String,
    zoomMeetingPassword: String,
    zoomJoinUrl: String,
    zoomStartUrl: String,
    // WebRTC/Custom fields
    meetingRoomId: {
      type: String,
      unique: true,
    },
    meetingUrl: String,
    // Status
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    // Settings
    maxParticipants: {
      type: Number,
      default: 100,
    },
    allowRecording: {
      type: Boolean,
      default: true,
    },
    requireRegistration: {
      type: Boolean,
      default: false,
    },
    // Recording
    recordingUrl: String,
    recordingAvailable: {
      type: Boolean,
      default: false,
    },
    // Attendance
    attendanceRequired: {
      type: Boolean,
      default: true,
    },
    // Metadata
    actualStartTime: Date,
    actualEndTime: Date,
    participantsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
liveClassSchema.index({ course: 1, scheduledStart: 1 });
liveClassSchema.index({ instructor: 1 });
liveClassSchema.index({ status: 1, scheduledStart: 1 });
// meetingRoomId index is created automatically by unique: true

const LiveClass = mongoose.model('LiveClass', liveClassSchema);

export default LiveClass;

