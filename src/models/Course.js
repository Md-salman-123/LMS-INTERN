import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a course title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a course description'],
    },
    shortDescription: {
      type: String,
      maxlength: 200,
    },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
      },
    ],
    thumbnail: String,
    tutorialVideo: {
      url: { type: String, trim: true },
      title: { type: String, trim: true, default: 'Course tutorial' },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [String],
    syllabus: {
      overview: String,
      learningObjectives: [String],
      prerequisites: [String],
      duration: {
        type: Number,
        default: 0, // in hours
      },
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner',
      },
      language: {
        type: String,
        default: 'English',
      },
    },
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    // Enrollment settings
    enrollmentType: {
      type: String,
      enum: ['manual', 'automatic', 'self', 'open'],
      default: 'self', // Default to 'self' to allow learners to self-enroll
    },
    autoEnroll: {
      type: Boolean,
      default: false, // Auto-enroll all users in organization
    },
    // Prerequisites
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    // Access duration (in days, 0 = unlimited)
    accessDuration: {
      type: Number,
      default: 0, // 0 = unlimited access
    },
    // Certificate settings
    autoGenerateCertificate: {
      type: Boolean,
      default: true, // Issue certificate when course is completed
    },
    certificateTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CertificateTemplate',
    },
    // Pricing
    isPaid: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Sale price (if on sale)
    salePrice: Number,
    saleStartDate: Date,
    saleEndDate: Date,
  },
  {
    timestamps: true,
  }
);

// Index for search and filtering
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1, status: 1, visibility: 1 });
courseSchema.index({ trainer: 1, organization: 1 });

const Course = mongoose.model('Course', courseSchema);

export default Course;

