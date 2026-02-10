import SkillBadge from '../models/SkillBadge.js';
import UserBadge from '../models/UserBadge.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// @desc    Get all badges
// @route   GET /api/badges
// @access  Private
export const getBadges = asyncHandler(async (req, res) => {
  const { type, rarity, isActive } = req.query;
  const query = {};

  if (type) query.type = type;
  if (rarity) query.rarity = rarity;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  else query.isActive = true;

  const badges = await SkillBadge.find(query).sort({ createdAt: -1 });

  // Get user's earned badges
  const userBadges = await UserBadge.find({ user: req.user._id }).select('badge');
  const earnedBadgeIds = userBadges.map((ub) => ub.badge.toString());

  const badgesWithStatus = badges.map((badge) => {
    const badgeObj = badge.toObject();
    badgeObj.earned = earnedBadgeIds.includes(badge._id.toString());
    return badgeObj;
  });

  res.json({
    success: true,
    data: badgesWithStatus,
  });
});

// @desc    Get user's badges
// @route   GET /api/badges/my-badges
// @access  Private
export const getMyBadges = asyncHandler(async (req, res) => {
  const userBadges = await UserBadge.find({ user: req.user._id })
    .populate('badge')
    .sort({ earnedAt: -1 });

  res.json({
    success: true,
    data: userBadges,
  });
});

// @desc    Award badge to user (manual or automatic)
// @route   POST /api/badges/:badgeId/award
// @access  Private/Admin/Trainer
export const awardBadge = asyncHandler(async (req, res) => {
  const { badgeId } = req.params;
  const { userId, context } = req.body;

  const badge = await SkillBadge.findById(badgeId);

  if (!badge) {
    return res.status(404).json({
      success: false,
      error: 'Badge not found',
    });
  }

  const targetUserId = userId || req.user._id;
  const targetUser = await User.findById(targetUserId);

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // Check if badge already awarded
  const existingBadge = await UserBadge.findOne({
    user: targetUserId,
    badge: badgeId,
  });

  if (existingBadge) {
    return res.status(400).json({
      success: false,
      error: 'Badge already awarded to this user',
    });
  }

  // Award badge
  const userBadge = await UserBadge.create({
    user: targetUserId,
    badge: badgeId,
    context: context || {},
    pointsEarned: badge.points || 0,
  });

  // Update user points
  targetUser.points = (targetUser.points || 0) + (badge.points || 0);
  await targetUser.save();

  res.status(201).json({
    success: true,
    data: userBadge,
    message: 'Badge awarded successfully',
  });
});

// @desc    Create badge
// @route   POST /api/badges
// @access  Private/Admin
export const createBadge = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    icon,
    type,
    criteria,
    rarity,
    points,
    isActive,
  } = req.body;

  const badge = await SkillBadge.create({
    name,
    description,
    icon: icon || '🏆',
    type: type || 'achievement',
    criteria,
    rarity: rarity || 'common',
    points: points || 0,
    isActive: isActive !== false,
    organization: req.user.organization,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: badge,
  });
});

// @desc    Check and award badges based on criteria
// @route   POST /api/badges/check-and-award
// @access  Private (internal use)
export const checkAndAwardBadges = asyncHandler(async (req, res) => {
  const { userId, eventType, eventData } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // Get all active badges
  const badges = await SkillBadge.find({ isActive: true });
  const awardedBadges = [];

  for (const badge of badges) {
    // Check if user already has this badge
    const existingBadge = await UserBadge.findOne({
      user: userId,
      badge: badge._id,
    });

    if (existingBadge) continue;

    // Check criteria based on badge type
    let shouldAward = false;

    switch (badge.criteria.type) {
      case 'course_completion':
        if (eventType === 'course_completed' && eventData.courseId) {
          shouldAward = badge.criteria.course?.toString() === eventData.courseId;
        }
        break;

      case 'quiz_score':
        if (eventType === 'quiz_completed' && eventData.quizId && eventData.score) {
          if (badge.criteria.quiz?.toString() === eventData.quizId) {
            const percentage = (eventData.score / eventData.total) * 100;
            shouldAward = percentage >= (badge.criteria.minScore || 80);
          }
        }
        break;

      case 'points':
        if (eventType === 'points_earned' && user.points) {
          shouldAward = user.points >= (badge.criteria.minPoints || 0);
        }
        break;

      case 'streak':
        if (eventType === 'daily_login' && user.streak) {
          shouldAward = user.streak.current >= (badge.criteria.streakDays || 7);
        }
        break;

      default:
        break;
    }

    if (shouldAward) {
      const userBadge = await UserBadge.create({
        user: userId,
        badge: badge._id,
        context: eventData || {},
        pointsEarned: badge.points || 0,
      });

      // Update user points
      user.points = (user.points || 0) + (badge.points || 0);
      await user.save();

      awardedBadges.push(userBadge);
    }
  }

  res.json({
    success: true,
    data: awardedBadges,
    message: `Awarded ${awardedBadges.length} badge(s)`,
  });
});


