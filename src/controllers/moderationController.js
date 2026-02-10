import ContentModeration from '../models/ContentModeration.js';
import Course from '../models/Course.js';
import Discussion from '../models/Discussion.js';
import Comment from '../models/Comment.js';
import Announcement from '../models/Announcement.js';
import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';

/** Resolve contentType + contentId to courseId (for org-scoping). Returns null if unknown. */
async function getCourseIdForContent(contentType, contentId) {
  if (!contentId) return null;
  try {
    switch (contentType) {
      case 'course':
        const c = await Course.findById(contentId).select('_id').lean();
        return c?._id ?? null;
      case 'discussion':
        const d = await Discussion.findById(contentId).select('course').lean();
        return d?.course ?? null;
      case 'announcement':
        const a = await Announcement.findById(contentId).select('course').lean();
        return a?.course ?? null;
      case 'comment':
        const com = await Comment.findById(contentId).select('discussion lesson announcement').lean();
        if (com?.discussion) {
          const dd = await Discussion.findById(com.discussion).select('course').lean();
          return dd?.course ?? null;
        }
        if (com?.announcement) {
          const aa = await Announcement.findById(com.announcement).select('course').lean();
          return aa?.course ?? null;
        }
        if (com?.lesson) {
          const les = await Lesson.findById(com.lesson).select('module').lean();
          if (!les?.module) return null;
          const mod = await Module.findById(les.module).select('course').lean();
          return mod?.course ?? null;
        }
        return null;
      case 'lesson':
        const les = await Lesson.findById(contentId).select('module').lean();
        if (!les?.module) return null;
        const mod = await Module.findById(les.module).select('course').lean();
        return mod?.course ?? null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// @desc    Report content
// @route   POST /api/moderation/report
// @access  Private
export const reportContent = async (req, res, next) => {
  try {
    const { contentType, contentId, reason, description } = req.body;

    // Check if already reported
    const existingReport = await ContentModeration.findOne({
      contentType,
      contentId,
      reportedBy: req.user._id,
      status: 'pending',
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        error: 'You have already reported this content',
      });
    }

    const report = await ContentModeration.create({
      contentType,
      contentId,
      reportedBy: req.user._id,
      reason,
      description,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get moderation reports
// @route   GET /api/moderation/reports
// @access  Private/Admin
export const getModerationReports = async (req, res, next) => {
  try {
    const { status, contentType } = req.query;
    const isOrgScopedAdmin = req.user.role === 'admin' && req.user.organization;
    const adminOrg = req.user.organization?.toString();

    let query = {};
    if (status) query.status = status;
    if (contentType) query.contentType = contentType;

    const reports = await ContentModeration.find(query)
      .populate('reportedBy', 'email profile')
      .populate('reviewedBy', 'email profile')
      .sort({ createdAt: -1 })
      .lean();

    const reportsWithContent = await Promise.all(
      reports.map(async (report) => {
        let content = null;
        try {
          switch (report.contentType) {
            case 'course':
              content = await Course.findById(report.contentId).select('title description');
              break;
            case 'discussion':
              content = await Discussion.findById(report.contentId).select('title content');
              break;
            case 'comment':
              content = await Comment.findById(report.contentId).select('content');
              break;
            case 'announcement':
              content = await Announcement.findById(report.contentId).select('title content');
              break;
          }
        } catch (error) {
          console.error('Error fetching content:', error);
        }

        return { ...report, content };
      })
    );

    let filtered = reportsWithContent;
    if (isOrgScopedAdmin && adminOrg) {
      const orgReportIds = new Set();
      for (const r of reportsWithContent) {
        const courseId = await getCourseIdForContent(r.contentType, r.contentId);
        if (!courseId) continue;
        const course = await Course.findById(courseId).select('organization').lean();
        if (course?.organization?.toString() === adminOrg) orgReportIds.add(r._id.toString());
      }
      filtered = reportsWithContent.filter((r) => orgReportIds.has(r._id.toString()));
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review moderation report
// @route   POST /api/moderation/reports/:id/review
// @access  Private/Admin
export const reviewModerationReport = async (req, res, next) => {
  try {
    const { status, action, notes } = req.body;

    const report = await ContentModeration.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    if (req.user.role === 'admin' && req.user.organization) {
      const courseId = await getCourseIdForContent(report.contentType, report.contentId);
      if (!courseId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot review reports for content outside your organization',
        });
      }
      const course = await Course.findById(courseId).select('organization').lean();
      if (course?.organization?.toString() !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Cannot review reports for content in other organizations',
        });
      }
    }

    report.status = status;
    report.action = action;
    report.notes = notes;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    // Take action based on action type
    if (action === 'remove' || action === 'hide') {
      // Hide or remove content based on type
      // Implementation depends on content type
    }

    const updatedReport = await ContentModeration.findById(report._id)
      .populate('reportedBy', 'email profile')
      .populate('reviewedBy', 'email profile');

    res.status(200).json({
      success: true,
      data: updatedReport,
    });
  } catch (error) {
    next(error);
  }
};


