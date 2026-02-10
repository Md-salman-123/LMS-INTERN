import Discussion from '../models/Discussion.js';
import Comment from '../models/Comment.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get discussions for a course
// @route   GET /api/discussions/course/:courseId
// @access  Private
export const getCourseDiscussions = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { category, search } = req.query;

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
        error: 'You must be enrolled in this course to view discussions',
      });
    }

    let query = { course: courseId };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const discussions = await Discussion.find(query)
      .populate('author', 'email profile')
      .populate('upvotes', 'email profile')
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    // Get comment counts for each discussion
    const discussionsWithCounts = await Promise.all(
      discussions.map(async (discussion) => {
        const commentCount = await Comment.countDocuments({ discussion: discussion._id });
        return { ...discussion, commentCount };
      })
    );

    res.status(200).json({
      success: true,
      count: discussionsWithCounts.length,
      data: discussionsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single discussion
// @route   GET /api/discussions/:id
// @access  Private
export const getDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'email profile')
      .populate('upvotes', 'email profile')
      .populate('course', 'title');

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    // Increment views
    discussion.views += 1;
    await discussion.save();

    // Get comments
    const comments = await Comment.find({ discussion: discussion._id })
      .populate('author', 'email profile')
      .populate('parentComment')
      .populate('upvotes', 'email profile')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...discussion.toObject(),
        comments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create discussion
// @route   POST /api/discussions
// @access  Private
export const createDiscussion = async (req, res, next) => {
  try {
    const { course, title, content, category, tags } = req.body;

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: course,
    });

    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // Allow if trainer/admin or enrolled
    if (
      courseDoc.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role) &&
      !enrollment
    ) {
      return res.status(403).json({
        success: false,
        error: 'You must be enrolled in this course to create discussions',
      });
    }

    const discussion = await Discussion.create({
      course,
      title,
      content,
      author: req.user._id,
      category: category || 'general',
      tags: tags || [],
    });

    const populatedDiscussion = await Discussion.findById(discussion._id)
      .populate('author', 'email profile')
      .populate('course', 'title');

    res.status(201).json({
      success: true,
      data: populatedDiscussion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update discussion
// @route   PUT /api/discussions/:id
// @access  Private
export const updateDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    // Check authorization
    const course = await Course.findById(discussion.course);
    if (
      discussion.author.toString() !== req.user._id.toString() &&
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this discussion',
      });
    }

    const { title, content, category, tags, isPinned, isLocked } = req.body;

    if (title) discussion.title = title;
    if (content) discussion.content = content;
    if (category) discussion.category = category;
    if (tags) discussion.tags = tags;
    if (isPinned !== undefined && ['super_admin', 'admin', 'trainer'].includes(req.user.role)) {
      discussion.isPinned = isPinned;
    }
    if (isLocked !== undefined && ['super_admin', 'admin', 'trainer'].includes(req.user.role)) {
      discussion.isLocked = isLocked;
    }

    await discussion.save();

    const populatedDiscussion = await Discussion.findById(discussion._id)
      .populate('author', 'email profile')
      .populate('course', 'title');

    res.status(200).json({
      success: true,
      data: populatedDiscussion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete discussion
// @route   DELETE /api/discussions/:id
// @access  Private
export const deleteDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    // Check authorization
    const course = await Course.findById(discussion.course);
    if (
      discussion.author.toString() !== req.user._id.toString() &&
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this discussion',
      });
    }

    // Delete all comments
    await Comment.deleteMany({ discussion: discussion._id });

    await discussion.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote/unupvote discussion
// @route   POST /api/discussions/:id/upvote
// @access  Private
export const toggleUpvote = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, error: 'Discussion not found' });
    }

    const userId = req.user._id;
    const upvoteIndex = discussion.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (upvoteIndex > -1) {
      discussion.upvotes.splice(upvoteIndex, 1);
    } else {
      discussion.upvotes.push(userId);
    }

    await discussion.save();

    res.status(200).json({
      success: true,
      data: {
        upvoted: upvoteIndex === -1,
        upvoteCount: discussion.upvotes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};


