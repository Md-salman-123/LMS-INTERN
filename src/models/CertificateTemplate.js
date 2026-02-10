import mongoose from 'mongoose';

const certificateTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a template name'],
      trim: true,
    },
    description: String,
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    // Template design settings
    design: {
      layout: {
        type: String,
        enum: ['landscape', 'portrait'],
        default: 'landscape',
      },
      backgroundColor: {
        type: String,
        default: '#FFFFFF',
      },
      borderColor: {
        type: String,
        default: '#000000',
      },
      borderWidth: {
        type: Number,
        default: 5,
      },
      // Text styles
      titleStyle: {
        fontSize: { type: Number, default: 40 },
        fontFamily: { type: String, default: 'Helvetica-Bold' },
        color: { type: String, default: '#000000' },
        alignment: { type: String, default: 'center' },
      },
      recipientStyle: {
        fontSize: { type: Number, default: 30 },
        fontFamily: { type: String, default: 'Helvetica-Bold' },
        color: { type: String, default: '#000000' },
        alignment: { type: String, default: 'center' },
      },
      courseStyle: {
        fontSize: { type: Number, default: 24 },
        fontFamily: { type: String, default: 'Helvetica-Bold' },
        color: { type: String, default: '#000000' },
        alignment: { type: String, default: 'center' },
      },
      // Logo settings
      logo: {
        url: String,
        position: { type: String, enum: ['top-left', 'top-center', 'top-right'], default: 'top-center' },
        width: { type: Number, default: 150 },
        height: { type: Number, default: 150 },
      },
      // Background image
      backgroundImage: {
        url: String,
        opacity: { type: Number, default: 0.1, min: 0, max: 1 },
      },
      // Signature settings
      signature: {
        show: { type: Boolean, default: true },
        position: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
        label: { type: String, default: 'Trainer Signature' },
      },
      // QR code settings
      qrCode: {
        show: { type: Boolean, default: true },
        position: { type: String, enum: ['bottom-left', 'bottom-center', 'bottom-right'], default: 'bottom-right' },
        size: { type: Number, default: 100 },
      },
    },
    // Template content
    content: {
      title: {
        type: String,
        default: 'Certificate of Completion',
      },
      subtitle: {
        type: String,
        default: 'This is to certify that',
      },
      body: {
        type: String,
        default: 'has successfully completed the course',
      },
      footer: String,
      issuer: {
        type: String,
        default: 'LMS Portal',
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Only one default template per organization
certificateTemplateSchema.index({ organization: 1, isDefault: 1 }, { unique: true, sparse: true });

const CertificateTemplate = mongoose.model('CertificateTemplate', certificateTemplateSchema);

export default CertificateTemplate;


