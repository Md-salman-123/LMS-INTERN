import mongoose from 'mongoose';
import crypto from 'crypto';

const certificateSchema = new mongoose.Schema(
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
    certificateNumber: {
      type: String,
      unique: true,
      required: true,
    },
    verificationId: {
      type: String,
      unique: true,
      required: true,
    },
    qrCodeUrl: String,
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CertificateTemplate',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pdfUrl: String,
    // Metadata
    metadata: {
      completionDate: Date,
      score: Number,
      grade: String,
    },
    // Share settings
    isPublic: {
      type: Boolean,
      default: false,
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate verification ID before saving
certificateSchema.pre('save', function (next) {
  if (!this.verificationId) {
    // Generate unique verification ID
    this.verificationId = `VER-${crypto.randomBytes(8).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  }
  if (!this.shareToken && this.isPublic) {
    // Generate share token for public sharing
    this.shareToken = crypto.randomBytes(16).toString('hex');
  }
  next();
});

// Prevent duplicate certificates
certificateSchema.index({ user: 1, course: 1 }, { unique: true });
// verificationId and shareToken indexes are created automatically by unique: true

const Certificate = mongoose.model('Certificate', certificateSchema);

export default Certificate;

