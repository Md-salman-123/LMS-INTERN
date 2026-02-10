import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema(
  {
    // Analytics type
    type: {
      type: String,
      enum: ['student_performance', 'course_engagement', 'revenue', 'instructor_effectiveness'],
      required: true,
    },
    // Related entities
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Time period
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'all_time'],
      default: 'all_time',
    },
    startDate: Date,
    endDate: Date,
    // Metrics data
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Aggregated data
    aggregatedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
analyticsSchema.index({ type: 1, createdAt: -1 });
analyticsSchema.index({ user: 1, type: 1 });
analyticsSchema.index({ course: 1, type: 1 });
analyticsSchema.index({ instructor: 1, type: 1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;


