import mongoose from 'mongoose';

const skillBadgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a badge name'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: '🏆', // Emoji or icon URL
    },
    // Badge type
    type: {
      type: String,
      enum: ['achievement', 'skill', 'milestone', 'certification'],
      default: 'achievement',
    },
    // Criteria for earning badge
    criteria: {
      type: {
        type: String,
        enum: ['course_completion', 'quiz_score', 'assignment_submission', 'coding_lab', 'streak', 'points', 'custom'],
        required: true,
      },
      // Course completion criteria
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
      // Quiz criteria
      quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
      },
      minScore: Number, // Minimum score percentage
      // Coding lab criteria
      codingLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingLab',
      },
      // Streak criteria
      streakDays: Number,
      // Points criteria
      minPoints: Number,
      // Custom criteria (JSON)
      customCriteria: mongoose.Schema.Types.Mixed,
    },
    // Rarity
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    // Points awarded
    points: {
      type: Number,
      default: 0,
    },
    // Organization specific
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (name already indexed via unique: true)
skillBadgeSchema.index({ type: 1, isActive: 1 });
skillBadgeSchema.index({ organization: 1 });

const SkillBadge = mongoose.model('SkillBadge', skillBadgeSchema);

export default SkillBadge;


