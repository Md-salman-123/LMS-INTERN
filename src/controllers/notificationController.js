import Notification from '../models/Notification.js';
import Quiz from '../models/Quiz.js';
import { sendEmail } from '../services/emailService.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/** Create a course-completion notification (server-side). Links to course quiz if available. Does not throw. */
export async function notifyCourseCompletion(userId, courseTitle, courseId) {
  try {
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || '';
    let link = courseId ? `${baseUrl}/courses/${courseId}` : undefined;
    let message = `Congratulations! You have completed "${courseTitle || 'the course'}".`;
    if (courseId) {
      const quiz = await Quiz.findOne({ course: courseId, status: 'published' }).sort({ createdAt: -1 }).lean();
      if (quiz) {
        link = `${baseUrl}/quizzes/${quiz._id}`;
        message = `Congratulations! You have completed "${courseTitle || 'the course'}". Take the course quiz to test your understanding.`;
      }
    }
    await Notification.create({
      user: userId,
      title: 'Course completed',
      message,
      type: 'completion',
      link: link || undefined,
    });
    logger.info(`Completion notification created for user ${userId}, course ${courseId}`);
  } catch (err) {
    logger.error('notifyCourseCompletion error:', err);
  }
}

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private
export const createNotification = async (req, res, next) => {
  try {
    const { userId, title, message, type, link, sendEmail: shouldSendEmail } = req.body;

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type: type || 'general',
      link,
    });

    // Send email if requested
    if (shouldSendEmail) {
      const user = await User.findById(userId);
      if (user && user.email) {
        await sendEmail({
          email: user.email,
          subject: title,
          message: `${message}\n\n${link ? `View: ${link}` : ''}`,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const { read, limit = 50 } = req.query;
    let query = { user: req.user._id };

    if (read !== undefined) {
      query.read = read === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};


