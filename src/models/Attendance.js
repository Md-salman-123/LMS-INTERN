import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    liveClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveClass',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'absent',
    },
    joinedAt: Date,
    leftAt: Date,
    duration: {
      type: Number, // in minutes
      default: 0,
    },
    // Auto-tracked attendance
    checkInTime: Date,
    checkOutTime: Date,
    // Manual attendance marking
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    markedAt: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance records
attendanceSchema.index({ liveClass: 1, user: 1 }, { unique: true });
attendanceSchema.index({ liveClass: 1, status: 1 });
attendanceSchema.index({ user: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;


