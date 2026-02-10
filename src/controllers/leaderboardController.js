import mongoose from 'mongoose';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const POINTS_PER_COURSE = 100;

// @desc    Get leaderboard
// @route   GET /api/leaderboard
// @access  Private
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { type = 'points', limit = 100 } = req.query;

  let sortField = {};
  let users = [];

  switch (type) {
    case 'points':
      sortField = { points: -1 };
      break;
    case 'level':
      sortField = { level: -1, points: -1 };
      break;
    case 'streak':
      sortField = { 'streak.current': -1, 'streak.longest': -1 };
      break;
    default:
      sortField = { points: -1 };
  }

  const learnerFilter = { status: 'active', role: { $in: ['learner', 'student'] } };
  const limitNum = Math.min(parseInt(limit, 10) || 100, 500);
  users = await User.find(learnerFilter)
    .select('email profile points level streak')
    .sort(sortField)
    .limit(500)
    .lean();

  // Completed course count per user (status 'completed' OR progress 100 so we never miss a completion)
  const completedCounts = await Enrollment.aggregate([
    { $match: { $or: [{ status: 'completed' }, { progress: 100 }] } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const completedByUser = new Map(completedCounts.map((r) => [r._id.toString(), r.count]));

  // Include learners who have completed courses but are not in top 500 by stored points
  const haveIds = new Set(users.map((u) => u._id.toString()));
  const missingIds = [...completedByUser.keys()].filter((id) => !haveIds.has(id));
  if (missingIds.length > 0) {
    const extraUsers = await User.find({
      _id: { $in: missingIds.map((id) => new mongoose.Types.ObjectId(id)) },
      ...learnerFilter,
    })
      .select('email profile points level streak')
      .lean();
    users = [...users, ...extraUsers];
  }

  const getDisplayPoints = (user) => {
    const stored = user.points || 0;
    const fromCourses = (completedByUser.get(user._id.toString()) || 0) * POINTS_PER_COURSE;
    return Math.max(stored, fromCourses);
  };

  // Build list with points from both stored and completed courses
  let list = users.map((user) => {
    const fullName =
      user.profile?.firstName && user.profile?.lastName
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : user.email?.split('@')[0] || 'User';
    const points = getDisplayPoints(user);
    return {
      userId: user._id,
      name: fullName,
      email: user.email,
      avatar: user.profile?.avatar,
      points,
      level: user.level || 1,
      currentStreak: user.streak?.current || 0,
      longestStreak: user.streak?.longest || 0,
    };
  });

  // Sort by selected type with deterministic tie-breakers so rank is consistent
  const byUserId = (a, b) => (a.userId.toString() < b.userId.toString() ? -1 : 1);
  if (type === 'points' || !type) {
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      if (b.longestStreak !== a.longestStreak) return b.longestStreak - a.longestStreak;
      return byUserId(a, b);
    });
  } else if (type === 'level') {
    list.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.points !== a.points) return b.points - a.points;
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      return byUserId(a, b);
    });
  } else if (type === 'streak') {
    list.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      if (b.longestStreak !== a.longestStreak) return b.longestStreak - a.longestStreak;
      if (b.points !== a.points) return b.points - a.points;
      return byUserId(a, b);
    });
  }
  const leaderboard = list.slice(0, limitNum).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  // Get current user's rank and display points
  const currentUser = await User.findById(req.user._id)
    .select('points level streak')
    .lean();

  if (currentUser) {
    const currentUserPoints = getDisplayPoints(currentUser);
    if (currentUserPoints > (currentUser.points || 0)) {
      await User.findByIdAndUpdate(req.user._id, { $set: { points: currentUserPoints } });
    }
    // Find current user's rank from the full sorted list (same order as leaderboard)
    let userRank = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].userId.toString() === req.user._id.toString()) {
        userRank = i + 1;
        break;
      }
    }
    if (userRank == null) userRank = list.length + 1; // not in list (e.g. not learner)

    res.json({
      success: true,
      data: {
        leaderboard,
        currentUser: {
          rank: userRank,
          points: currentUserPoints,
          level: currentUser.level || 1,
          currentStreak: currentUser.streak?.current || 0,
          longestStreak: currentUser.streak?.longest || 0,
        },
        type,
      },
    });
  } else {
    res.json({
      success: true,
      data: {
        leaderboard,
        currentUser: null,
        type,
      },
    });
  }
});


