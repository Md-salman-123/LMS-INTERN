import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Payment type
    type: {
      type: String,
      enum: ['course_purchase', 'subscription', 'renewal'],
      required: true,
    },
    // Related entities
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    // Amount details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Discount
    discountAmount: {
      type: Number,
      default: 0,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    // Final amount after discount
    finalAmount: {
      type: Number,
      required: true,
    },
    // Payment gateway
    gateway: {
      type: String,
      enum: ['stripe', 'paypal', 'razorpay', 'manual', 'free'],
      default: 'stripe',
    },
    // Payment status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    // Gateway transaction details
    transactionId: String,
    gatewayPaymentId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    // Invoice
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    // Metadata
    paymentMethod: String, // card, bank_transfer, etc.
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ course: 1 });
paymentSchema.index({ subscription: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ gatewayPaymentId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

