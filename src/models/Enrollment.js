import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    status: {
      type: String,
      enum: ['enrolled', 'in_progress', 'completed', 'expired', 'suspended'],
      default: 'enrolled',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    enrollmentType: {
      type: String,
      enum: ['manual', 'automatic', 'self'],
      default: 'manual',
    },
    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Access duration control
    accessStartDate: {
      type: Date,
      default: Date.now,
    },
    accessEndDate: Date, // Calculated from course.accessDuration
    expiresAt: Date, // When enrollment expires
    isActive: {
      type: Boolean,
      default: true,
    },
    completedAt: Date,
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    // Time tracking
    totalTimeSpent: {
      type: Number, // in minutes
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    // Performance metrics
    averageQuizScore: {
      type: Number,
      default: null,
    },
    averageAssignmentScore: {
      type: Number,
      default: null,
    },
    quizzesCompleted: {
      type: Number,
      default: 0,
    },
    assignmentsCompleted: {
      type: Number,
      default: 0,
    },
    certificatesEarned: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate enrollments (user + course + batch combination)
enrollmentSchema.index({ user: 1, course: 1, batch: 1 }, { unique: true, sparse: true });
enrollmentSchema.index({ user: 1, course: 1 }); // For queries without batch
enrollmentSchema.index({ batch: 1 });
enrollmentSchema.index({ expiresAt: 1 }); // For expiration queries

// Method to check if enrollment is expired
enrollmentSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Method to check if enrollment has active access
enrollmentSchema.methods.hasActiveAccess = function () {
  if (!this.isActive) return false;
  if (this.isExpired()) return false;
  if (this.accessEndDate && new Date() > this.accessEndDate) return false;
  return true;
};

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;

