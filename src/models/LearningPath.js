import mongoose from 'mongoose';

const learningPathSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a learning path title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a learning path description'],
    },
    shortDescription: {
      type: String,
      maxlength: 200,
    },
    thumbnail: String,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    // Structured course sequence
    courses: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        isRequired: {
          type: Boolean,
          default: true, // Must complete before next course
        },
        unlockAfterCompletion: {
          type: Boolean,
          default: true,
        },
      },
    ],
    // Skill-based learning
    skills: [
      {
        name: String,
        level: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        },
      },
    ],
    // Duration and level
    estimatedDuration: {
      type: Number, // in hours
      default: 0,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    // Enrollment
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    // Status
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Badge/Certificate on completion
    completionBadge: {
      name: String,
      description: String,
      icon: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
learningPathSchema.index({ status: 1, visibility: 1 });
learningPathSchema.index({ category: 1 });
learningPathSchema.index({ title: 'text', description: 'text' });

const LearningPath = mongoose.model('LearningPath', learningPathSchema);

export default LearningPath;


