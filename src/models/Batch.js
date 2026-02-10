import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a batch name'],
      trim: true,
    },
    description: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    maxCapacity: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    enrollmentType: {
      type: String,
      enum: ['manual', 'automatic', 'open'],
      default: 'manual',
    },
    autoEnroll: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
batchSchema.index({ course: 1, organization: 1 });
batchSchema.index({ startDate: 1, endDate: 1 });

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;


