import Announcement from '../models/Announcement.js';
import Comment from '../models/Comment.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get announcements for a course
// @route   GET /api/announcements/course/:courseId
// @access  Private
export const getCourseAnnouncements = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: courseId,
    });

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // Allow access if user is trainer/admin or enrolled
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role) &&
      !enrollment
    ) {
      return res.status(403).json({
        success: false,
        error: 'You must be enrolled in this course to view announcements',
      });
    }

    const now = new Date();
    const announcements = await Announcement.find({
      course: courseId,
      $or: [
        { scheduledAt: { $lte: now } },
        { scheduledAt: null },
      ],
      $or: [
        { expiresAt: { $gte: now } },
        { expiresAt: null },
      ],
    })
      .populate('author', 'email profile')
      .sort({ isPinned: -1, priority: -1, createdAt: -1 });

    // Mark as read for current user
    for (const announcement of announcements) {
      const alreadyRead = announcement.readBy.some(
        (read) => read.user.toString() === req.user._id.toString()
      );
      if (!alreadyRead) {
        announcement.readBy.push({
          user: req.user._id,
          readAt: new Date(),
        });
        await announcement.save();
      }
    }

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Private
export const getAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('author', 'email profile')
      .populate('course', 'title');

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    // Mark as read
    const alreadyRead = announcement.readBy.some(
      (read) => read.user.toString() === req.user._id.toString()
    );
    if (!alreadyRead) {
      announcement.readBy.push({
        user: req.user._id,
        readAt: new Date(),
      });
      await announcement.save();
    }

    // Get comments
    const comments = await Comment.find({ announcement: announcement._id })
      .populate('author', 'email profile')
      .populate('parentComment')
      .populate('upvotes', 'email profile')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...announcement.toObject(),
        comments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private/Trainer/Admin
export const createAnnouncement = async (req, res, next) => {
  try {
    const { course, title, content, priority, isPinned, scheduledAt, expiresAt, attachments } =
      req.body;

    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // Only trainer/admin can create announcements
    if (
      courseDoc.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Only instructors can create announcements',
      });
    }

    const announcement = await Announcement.create({
      course,
      title,
      content,
      author: req.user._id,
      priority: priority || 'normal',
      isPinned: isPinned || false,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      attachments: attachments || [],
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('author', 'email profile')
      .populate('course', 'title');

    res.status(201).json({
      success: true,
      data: populatedAnnouncement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private/Trainer/Admin
export const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    // Check authorization
    const course = await Course.findById(announcement.course);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this announcement',
      });
    }

    const { title, content, priority, isPinned, scheduledAt, expiresAt, attachments } = req.body;

    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (priority) announcement.priority = priority;
    if (isPinned !== undefined) announcement.isPinned = isPinned;
    if (scheduledAt !== undefined) announcement.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (attachments) announcement.attachments = attachments;

    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('author', 'email profile')
      .populate('course', 'title');

    res.status(200).json({
      success: true,
      data: populatedAnnouncement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Trainer/Admin
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    // Check authorization
    const course = await Course.findById(announcement.course);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this announcement',
      });
    }

    // Delete all comments
    await Comment.deleteMany({ announcement: announcement._id });

    await announcement.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};


