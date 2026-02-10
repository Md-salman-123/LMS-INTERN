import LearningPath from '../models/LearningPath.js';
import LearningPathEnrollment from '../models/LearningPathEnrollment.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generateLearningPathSuggestion } from '../services/learningPathAiService.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// @desc    Get all learning paths
// @route   GET /api/learning-paths
// @access  Public/Private
export const getLearningPaths = asyncHandler(async (req, res) => {
  const { status, category, level, search } = req.query;
  const isStaff = req.user && ['admin', 'super_admin', 'trainer', 'instructor'].includes(req.user.role);

  const conditions = [];

  conditions.push({
    status: status || (isStaff ? { $in: ['published', 'draft'] } : 'published'),
  });
  if (category) conditions.push({ category });
  if (level) conditions.push({ level });

  const searchTerm = search && typeof search === 'string' ? search.trim() : '';
  if (searchTerm.length >= 1) {
    try {
      const regex = new RegExp(escapeRegex(searchTerm), 'i');
      conditions.push({
        $or: [
          { title: regex },
          { description: regex },
          { shortDescription: regex },
        ],
      });
    } catch (_) {}
  }

  // Non-staff: restrict by org/visibility. Treat missing visibility as public.
  const publicVisibility = { $or: [{ visibility: 'public' }, { visibility: { $exists: false } }] };
  if (!isStaff) {
    if (req.user && req.user.organization) {
      conditions.push({
        $or: [
          { organization: req.user.organization },
          { organization: null },
          publicVisibility,
        ],
      });
    } else if (!req.user) {
      conditions.push({ ...publicVisibility, status: 'published' });
    }
  }

  const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

  let learningPaths = [];
  try {
    learningPaths = await LearningPath.find(query)
      .populate('category', 'name')
      .populate('courses.course', 'title thumbnail')
      .populate('createdBy', 'profile.firstName profile.lastName email')
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    console.error('getLearningPaths find error:', err.message);
  }

  res.json({
    success: true,
    count: learningPaths.length,
    data: learningPaths,
  });
});

// @desc    Get single learning path
// @route   GET /api/learning-paths/:id
// @access  Public/Private
export const getLearningPath = asyncHandler(async (req, res) => {
  const learningPath = await LearningPath.findById(req.params.id)
    .populate('category', 'name')
    .populate('courses.course')
    .populate('createdBy', 'profile.firstName profile.lastName email');

  if (!learningPath) {
    return res.status(404).json({
      success: false,
      error: 'Learning path not found',
    });
  }

  // Check if user is enrolled
  let enrollment = null;
  if (req.user) {
    enrollment = await LearningPathEnrollment.findOne({
      learningPath: req.params.id,
      user: req.user._id,
    }).populate('completedCourses.course');
  }

  res.json({
    success: true,
    data: {
      learningPath,
      enrollment,
    },
  });
});

// @desc    Generate learning path automatically (AI or keyword-based)
// @route   POST /api/learning-paths/generate
// @access  Private/Trainer/Admin
export const generateLearningPath = asyncHandler(async (req, res) => {
  const { topic, level, maxCourses = 8 } = req.body || {};

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a topic (e.g. "Web Development", "Data Science")',
    });
  }

  const courseQuery = { status: 'published' };
  if (req.user.organization) {
    courseQuery.$or = [{ organization: req.user.organization }, { organization: null }];
  }

  const courses = await Course.find(courseQuery)
    .select('_id title description shortDescription syllabus')
    .lean();

  if (!courses.length) {
    return res.status(400).json({
      success: false,
      error: 'No published courses available to build a learning path',
    });
  }

  const suggestion = await generateLearningPathSuggestion(topic.trim(), courses, {
    preferredLevel: level,
    maxCourses: Math.min(Math.max(1, parseInt(maxCourses, 10) || 8), 20),
  });

  const validCourseIds = new Set(courses.map((c) => String(c._id)));
  const orderedIds = suggestion.courseIds.filter((id) => validCourseIds.has(id));

  const coursesForPath = orderedIds.map((id, index) => ({
    course: id,
    order: index + 1,
    isRequired: true,
    unlockAfterCompletion: true,
  }));

  const learningPath = await LearningPath.create({
    title: suggestion.title,
    description: suggestion.description,
    shortDescription: suggestion.shortDescription,
    level: suggestion.level,
    courses: coursesForPath,
    status: 'published',
    visibility: 'public',
    createdBy: req.user._id,
    organization: req.user.organization,
  });

  const populated = await LearningPath.findById(learningPath._id)
    .populate('category', 'name')
    .populate('courses.course', 'title thumbnail')
    .populate('createdBy', 'profile.firstName profile.lastName email');

  res.status(201).json({
    success: true,
    data: populated,
    message: 'Learning path generated. Review and publish when ready.',
  });
});

// @desc    Create learning path
// @route   POST /api/learning-paths
// @access  Private/Trainer/Admin
export const createLearningPath = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    shortDescription,
    thumbnail,
    category,
    courses,
    skills,
    estimatedDuration,
    level,
    completionBadge,
  } = req.body;

  const learningPath = await LearningPath.create({
    title,
    description,
    shortDescription,
    thumbnail,
    category,
    courses: courses || [],
    skills: skills || [],
    estimatedDuration,
    level,
    completionBadge,
    createdBy: req.user._id,
    organization: req.user.organization,
  });

  res.status(201).json({
    success: true,
    data: learningPath,
  });
});

// @desc    Enroll in learning path
// @route   POST /api/learning-paths/:id/enroll
// @access  Private
export const enrollInLearningPath = asyncHandler(async (req, res) => {
  const learningPath = await LearningPath.findById(req.params.id);

  if (!learningPath) {
    return res.status(404).json({
      success: false,
      error: 'Learning path not found',
    });
  }

  // Check if already enrolled
  let enrollment = await LearningPathEnrollment.findOne({
    learningPath: req.params.id,
    user: req.user._id,
  });

  if (enrollment) {
    return res.json({
      success: true,
      data: enrollment,
      message: 'Already enrolled',
    });
  }

  // Create enrollment
  enrollment = await LearningPathEnrollment.create({
    learningPath: req.params.id,
    user: req.user._id,
    status: 'enrolled',
    enrolledAt: new Date(),
    startedAt: new Date(),
    lastAccessedAt: new Date(),
  });

  // Auto-enroll in first course if available
  if (learningPath.courses.length > 0) {
    const firstCourse = learningPath.courses[0].course;
    const courseEnrollment = await Enrollment.findOne({
      course: firstCourse,
      user: req.user._id,
    });

    if (!courseEnrollment) {
      await Enrollment.create({
        course: firstCourse,
        user: req.user._id,
        status: 'enrolled',
        enrolledAt: new Date(),
      });
    }
  }

  // Update enrollment count
  learningPath.enrollmentCount += 1;
  await learningPath.save();

  res.status(201).json({
    success: true,
    data: enrollment,
  });
});

// @desc    Get user's learning path progress
// @route   GET /api/learning-paths/:id/progress
// @access  Private
export const getLearningPathProgress = asyncHandler(async (req, res) => {
  const enrollment = await LearningPathEnrollment.findOne({
    learningPath: req.params.id,
    user: req.user._id,
  })
    .populate('learningPath')
    .populate('completedCourses.course');

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      error: 'Not enrolled in this learning path',
    });
  }

  // Calculate progress
  const learningPath = enrollment.learningPath;
  const totalCourses = learningPath.courses.length;
  const completedCount = enrollment.completedCourses.length;
  const progress = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  enrollment.progress = progress;
  await enrollment.save();

  res.json({
    success: true,
    data: {
      enrollment,
      progress,
      completedCount,
      totalCourses,
    },
  });
});

// @desc    Update learning path
// @route   PUT /api/learning-paths/:id
// @access  Private/Trainer/Admin
export const updateLearningPath = asyncHandler(async (req, res) => {
  let learningPath = await LearningPath.findById(req.params.id);

  if (!learningPath) {
    return res.status(404).json({
      success: false,
      error: 'Learning path not found',
    });
  }

  // Check authorization
  if (
    learningPath.createdBy.toString() !== req.user._id.toString() &&
    !req.user.isAdmin()
  ) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this learning path',
    });
  }

  learningPath = await LearningPath.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: learningPath,
  });
});

// @desc    Delete learning path
// @route   DELETE /api/learning-paths/:id
// @access  Private/Trainer/Admin
export const deleteLearningPath = asyncHandler(async (req, res) => {
  const learningPath = await LearningPath.findById(req.params.id);

  if (!learningPath) {
    return res.status(404).json({
      success: false,
      error: 'Learning path not found',
    });
  }

  // Check authorization
  if (
    learningPath.createdBy.toString() !== req.user._id.toString() &&
    !req.user.isAdmin()
  ) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this learning path',
    });
  }

  await learningPath.deleteOne();

  res.json({
    success: true,
    data: {},
  });
});

