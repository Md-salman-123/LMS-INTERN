import Comment from '../models/Comment.js';
import Discussion from '../models/Discussion.js';
import Lesson from '../models/Lesson.js';
import Announcement from '../models/Announcement.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get comments for a discussion/lesson/announcement
// @route   GET /api/comments
// @access  Private
export const getComments = async (req, res, next) => {
  try {
    const { discussion, lesson, announcement } = req.query;

    let query = {};
    if (discussion) query.discussion = discussion;
    if (lesson) query.lesson = lesson;
    if (announcement) query.announcement = announcement;

    const comments = await Comment.find(query)
      .populate('author', 'email profile')
      .populate('parentComment')
      .populate('upvotes', 'email profile')
      .populate('resolvedBy', 'email profile')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create comment
// @route   POST /api/comments
// @access  Private
export const createComment = async (req, res, next) => {
  try {
    const { discussion, lesson, announcement, parentComment, content } = req.body;

    // Validate that at least one parent is provided
    if (!discussion && !lesson && !announcement) {
      return res.status(400).json({
        success: false,
        error: 'Must provide discussion, lesson, or announcement',
      });
    }

    // Check access permissions
    if (discussion) {
      const discussionDoc = await Discussion.findById(discussion).populate('course');
      if (!discussionDoc) {
        return res.status(404).json({ success: false, error: 'Discussion not found' });
      }

      const enrollment = await Enrollment.findOne({
        user: req.user._id,
        course: discussionDoc.course._id,
      });

      const course = await Course.findById(discussionDoc.course);
      if (
        course.trainer.toString() !== req.user._id.toString() &&
        !['super_admin', 'admin'].includes(req.user.role) &&
        !enrollment
      ) {
        return res.status(403).json({
          success: false,
          error: 'You must be enrolled in this course to comment',
        });
      }
    }

    if (lesson) {
      const lessonDoc = await Lesson.findById(lesson).populate({
        path: 'module',
        populate: { path: 'course' },
      });

      if (!lessonDoc) {
        return res.status(404).json({ success: false, error: 'Lesson not found' });
      }

      const enrollment = await Enrollment.findOne({
        user: req.user._id,
        course: lessonDoc.module.course._id,
      });

      const course = await Course.findById(lessonDoc.module.course._id);
      if (
        course.trainer.toString() !== req.user._id.toString() &&
        !['super_admin', 'admin'].includes(req.user.role) &&
        !enrollment
      ) {
        return res.status(403).json({
          success: false,
          error: 'You must be enrolled in this course to comment',
        });
      }
    }

    if (announcement) {
      const announcementDoc = await Announcement.findById(announcement).populate('course');
      if (!announcementDoc) {
        return res.status(404).json({ success: false, error: 'Announcement not found' });
      }

      const enrollment = await Enrollment.findOne({
        user: req.user._id,
        course: announcementDoc.course._id,
      });

      const course = await Course.findById(announcementDoc.course._id);
      if (
        course.trainer.toString() !== req.user._id.toString() &&
        !['super_admin', 'admin'].includes(req.user.role) &&
        !enrollment
      ) {
        return res.status(403).json({
          success: false,
          error: 'You must be enrolled in this course to comment',
        });
      }
    }

    const comment = await Comment.create({
      discussion,
      lesson,
      announcement,
      parentComment,
      author: req.user._id,
      content,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'email profile')
      .populate('parentComment');

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private
export const updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Only author can update
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this comment',
      });
    }

    const { content } = req.body;

    if (content) {
      comment.content = content;
      comment.isEdited = true;
      comment.editedAt = new Date();
    }

    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'email profile')
      .populate('parentComment');

    res.status(200).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Check authorization - author, trainer, or admin
    let canDelete = comment.author.toString() === req.user._id.toString();

    if (!canDelete) {
      // Check if user is trainer/admin
      if (['super_admin', 'admin'].includes(req.user.role)) {
        canDelete = true;
      } else if (comment.discussion) {
        const discussion = await Discussion.findById(comment.discussion).populate('course');
        const course = await Course.findById(discussion.course._id);
        if (course.trainer.toString() === req.user._id.toString()) {
          canDelete = true;
        }
      } else if (comment.lesson) {
        const lesson = await Lesson.findById(comment.lesson).populate({
          path: 'module',
          populate: { path: 'course' },
        });
        const course = await Course.findById(lesson.module.course._id);
        if (course.trainer.toString() === req.user._id.toString()) {
          canDelete = true;
        }
      } else if (comment.announcement) {
        const announcement = await Announcement.findById(comment.announcement).populate('course');
        const course = await Course.findById(announcement.course._id);
        if (course.trainer.toString() === req.user._id.toString()) {
          canDelete = true;
        }
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this comment',
      });
    }

    // Delete nested replies
    await Comment.deleteMany({ parentComment: comment._id });

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote/unupvote comment
// @route   POST /api/comments/:id/upvote
// @access  Private
export const toggleUpvote = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const userId = req.user._id;
    const upvoteIndex = comment.upvotes.findIndex((id) => id.toString() === userId.toString());

    if (upvoteIndex > -1) {
      comment.upvotes.splice(upvoteIndex, 1);
    } else {
      comment.upvotes.push(userId);
    }

    await comment.save();

    res.status(200).json({
      success: true,
      data: {
        upvoted: upvoteIndex === -1,
        upvoteCount: comment.upvotes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark comment as resolved (for doubt clearing)
// @route   POST /api/comments/:id/resolve
// @access  Private/Trainer/Admin
export const resolveComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Only trainer/admin can resolve
    let canResolve = ['super_admin', 'admin'].includes(req.user.role);

    if (!canResolve) {
      if (comment.discussion) {
        const discussion = await Discussion.findById(comment.discussion).populate('course');
        const course = await Course.findById(discussion.course._id);
        if (course.trainer.toString() === req.user._id.toString()) {
          canResolve = true;
        }
      } else if (comment.lesson) {
        const lesson = await Lesson.findById(comment.lesson).populate({
          path: 'module',
          populate: { path: 'course' },
        });
        const course = await Course.findById(lesson.module.course._id);
        if (course.trainer.toString() === req.user._id.toString()) {
          canResolve = true;
        }
      }
    }

    if (!canResolve) {
      return res.status(403).json({
        success: false,
        error: 'Only instructors can resolve comments',
      });
    }

    comment.isResolved = !comment.isResolved;
    if (comment.isResolved) {
      comment.resolvedBy = req.user._id;
      comment.resolvedAt = new Date();
    } else {
      comment.resolvedBy = null;
      comment.resolvedAt = null;
    }

    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'email profile')
      .populate('resolvedBy', 'email profile');

    res.status(200).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};


