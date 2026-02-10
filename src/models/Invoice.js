import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Related payment
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    // Invoice type
    type: {
      type: String,
      enum: ['course_purchase', 'subscription', 'renewal'],
      required: true,
    },
    // Billing details
    billingAddress: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    // Items
    items: [
      {
        name: String,
        description: String,
        quantity: {
          type: Number,
          default: 1,
        },
        unitPrice: Number,
        totalPrice: Number,
      },
    ],
    // Amounts
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Payment details
    paymentMethod: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paidAt: Date,
    // PDF
    pdfUrl: String,
    // Status
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'cancelled'],
      default: 'draft',
    },
    // Notes
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
// invoiceNumber index is created automatically by unique: true
invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ payment: 1 });
invoiceSchema.index({ status: 1 });

// Generate invoice number before saving
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${Date.now()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;

