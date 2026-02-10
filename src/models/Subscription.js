import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Subscription plan
    plan: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      required: true,
    },
    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Discount applied
    discountAmount: {
      type: Number,
      default: 0,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    // Final price
    finalPrice: {
      type: Number,
      required: true,
    },
    // Dates
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'suspended'],
      default: 'active',
    },
    // Auto-renewal
    autoRenew: {
      type: Boolean,
      default: true,
    },
    // Payment gateway subscription ID (for recurring payments)
    gatewaySubscriptionId: String,
    // Cancellation
    cancelledAt: Date,
    cancellationReason: String,
    // Access to courses
    accessToAllCourses: {
      type: Boolean,
      default: true,
    },
    allowedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    // Metadata
    nextBillingDate: Date,
    lastPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ gatewaySubscriptionId: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function () {
  if (this.status !== 'active') return false;
  return new Date() <= new Date(this.endDate);
};

// Method to check if subscription has access to a course
subscriptionSchema.methods.hasAccessToCourse = function (courseId) {
  if (!this.isActive()) return false;
  if (this.accessToAllCourses) return true;
  return this.allowedCourses.some((id) => id.toString() === courseId.toString());
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;

