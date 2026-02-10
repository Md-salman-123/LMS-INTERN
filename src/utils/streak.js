import User from '../models/User.js';

/**
 * Get today's date at midnight UTC (date-only for comparison).
 */
function getTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Update user streak when they perform an "activity" (e.g. login, complete a lesson).
 * - If last active today: no change.
 * - If last active yesterday: increment current streak; update longest if needed.
 * - If last active earlier: reset current to 1.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<void>}
 */
export async function updateUserStreak(userId) {
  if (!userId) return;
  const user = await User.findById(userId).select('streak').lean();
  if (!user) return;

  const today = getTodayUTC();
  const lastActive = user.streak?.lastActiveDate
    ? new Date(user.streak.lastActiveDate)
    : null;
  const lastDate = lastActive
    ? new Date(
        Date.UTC(
          lastActive.getUTCFullYear(),
          lastActive.getUTCMonth(),
          lastActive.getUTCDate()
        )
      )
    : null;

  if (lastDate && lastDate.getTime() === today.getTime()) {
    return; // already active today
  }

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  let newCurrent = 1;
  if (lastDate && lastDate.getTime() === yesterday.getTime()) {
    newCurrent = (user.streak?.current || 0) + 1;
  }

  const newLongest = Math.max(user.streak?.longest || 0, newCurrent);

  await User.findByIdAndUpdate(userId, {
    $set: {
      'streak.current': newCurrent,
      'streak.longest': newLongest,
      'streak.lastActiveDate': today,
    },
  });
}
