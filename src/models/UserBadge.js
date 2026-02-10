import mongoose from 'mongoose';

const userBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillBadge',
      required: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    // Context of earning (which course, quiz, etc.)
    context: {
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
      quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
      },
      codingLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingLab',
      },
      enrollment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment',
      },
    },
    // Points earned
    pointsEarned: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });
userBadgeSchema.index({ user: 1, earnedAt: -1 });
userBadgeSchema.index({ badge: 1 });

const UserBadge = mongoose.model('UserBadge', userBadgeSchema);

export default UserBadge;


