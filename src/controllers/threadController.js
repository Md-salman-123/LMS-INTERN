import Thread from '../models/Thread.js';
import Discussion from '../models/Discussion.js';
import Comment from '../models/Comment.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get threads for a discussion
// @route   GET /api/threads/discussion/:discussionId
// @access  Private
export const getDiscussionThreads = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { type, status } = req.query;

    const discussion = await Discussion.findById(discussionId).populate('course');
    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    let query = { discussion: discussionId };
    if (type) query.type = type;
    if (status) query.status = status;

    const threads = await Thread.find(query)
      .populate('author', 'email profile')
      .populate('resolvedBy', 'email profile')
      .sort({ createdAt: -1 });

    // Get comment counts
    const threadsWithCounts = await Promise.all(
      threads.map(async (thread) => {
        const commentCount = await Comment.countDocuments({
          discussion: discussionId,
          // You might want to link comments to threads if needed
        });
        return { ...thread.toObject(), commentCount };
      })
    );

    res.status(200).json({
      success: true,
      count: threadsWithCounts.length,
      data: threadsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single thread
// @route   GET /api/threads/:id
// @access  Private
export const getThread = async (req, res, next) => {
  try {
    const thread = await Thread.findById(req.params.id)
      .populate('author', 'email profile')
      .populate('resolvedBy', 'email profile')
      .populate({
        path: 'discussion',
        populate: { path: 'course' },
      });

    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread not found' });
    }

    // Increment views
    thread.views += 1;
    await thread.save();

    res.status(200).json({
      success: true,
      data: thread,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create thread
// @route   POST /api/threads
// @access  Private
export const createThread = async (req, res, next) => {
  try {
    const { discussion, title, content, type, tags } = req.body;

    const discussionDoc = await Discussion.findById(discussion).populate('course');
    if (!discussionDoc) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: discussionDoc.course._id,
    });

    const course = await Course.findById(discussionDoc.course._id);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role) &&
      !enrollment
    ) {
      return res.status(403).json({
        success: false,
        error: 'You must be enrolled in this course to create threads',
      });
    }

    const thread = await Thread.create({
      discussion,
      title,
      content,
      author: req.user._id,
      type: type || 'doubt',
      tags: tags || [],
    });

    const populatedThread = await Thread.findById(thread._id)
      .populate('author', 'email profile')
      .populate({
        path: 'discussion',
        populate: { path: 'course' },
      });

    res.status(201).json({
      success: true,
      data: populatedThread,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update thread
// @route   PUT /api/threads/:id
// @access  Private
export const updateThread = async (req, res, next) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread not found' });
    }

    // Check authorization
    const discussion = await Discussion.findById(thread.discussion).populate('course');
    const course = await Course.findById(discussion.course._id);
    if (
      thread.author.toString() !== req.user._id.toString() &&
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this thread',
      });
    }

    const { title, content, type, tags, status } = req.body;

    if (title) thread.title = title;
    if (content) thread.content = content;
    if (type) thread.type = type;
    if (tags) thread.tags = tags;
    if (status && ['super_admin', 'admin', 'trainer'].includes(req.user.role)) {
      thread.status = status;
      if (status === 'resolved') {
        thread.resolvedBy = req.user._id;
        thread.resolvedAt = new Date();
      } else if (status !== 'resolved') {
        thread.resolvedBy = null;
        thread.resolvedAt = null;
      }
    }

    await thread.save();

    const populatedThread = await Thread.findById(thread._id)
      .populate('author', 'email profile')
      .populate('resolvedBy', 'email profile');

    res.status(200).json({
      success: true,
      data: populatedThread,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete thread
// @route   DELETE /api/threads/:id
// @access  Private
export const deleteThread = async (req, res, next) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread not found' });
    }

    // Check authorization
    const discussion = await Discussion.findById(thread.discussion).populate('course');
    const course = await Course.findById(discussion.course._id);
    if (
      thread.author.toString() !== req.user._id.toString() &&
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this thread',
      });
    }

    await thread.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};


