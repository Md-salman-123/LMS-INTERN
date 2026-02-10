import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please provide a coupon code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a coupon name'],
    },
    description: String,
    // Discount type
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    // Discount value
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    // Maximum discount amount (for percentage)
    maxDiscountAmount: Number,
    // Minimum purchase amount
    minPurchaseAmount: {
      type: Number,
      default: 0,
    },
    // Applicable to
    applicableTo: {
      type: String,
      enum: ['all', 'courses', 'subscriptions', 'specific_courses'],
      default: 'all',
    },
    // Specific courses (if applicableTo is 'specific_courses')
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    // Validity
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    // Usage limits
    maxUses: {
      type: Number,
      default: null, // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    maxUsesPerUser: {
      type: Number,
      default: 1,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Created by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// code index is created automatically by unique: true
couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
couponSchema.index({ organization: 1 });

// Method to check if coupon is valid
couponSchema.methods.isValid = function () {
  if (!this.isActive) return false;
  const now = new Date();
  if (now < this.validFrom || now > this.validUntil) return false;
  if (this.maxUses && this.usedCount >= this.maxUses) return false;
  return true;
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function (amount) {
  if (!this.isValid()) return 0;
  if (amount < this.minPurchaseAmount) return 0;

  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (amount * this.discountValue) / 100;
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else {
    discount = this.discountValue;
  }

  return Math.min(discount, amount); // Discount can't exceed amount
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;

