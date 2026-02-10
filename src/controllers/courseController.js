import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
export const getCourses = async (req, res, next) => {
  try {
    // Safety check - req.user should be set by authenticate middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    let query = {};

    // Filter by role
    if (req.user.role === 'trainer' || req.user.role === 'instructor') {
      query.trainer = req.user._id;
    } else if (req.user.role === 'learner' || req.user.role === 'student') {
      query.status = 'published';
      // Students can only see public courses or courses they're enrolled in
      // This will be filtered further if needed
    }

    // Filter by visibility
    if (req.query.visibility) {
      query.visibility = req.query.visibility;
    } else if (req.user.role === 'learner' || req.user.role === 'student') {
      // Students see public courses by default
      query.visibility = 'public';
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by status (trainer/admin only; learners only see published)
    if (req.query.status && (req.user.role === 'trainer' || req.user.role === 'instructor' || req.user.role === 'admin' || req.user.role === 'super_admin')) {
      query.status = req.query.status;
    }

    // Filter by tags
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
    }

    // Search
    if (req.query.search && req.query.search.trim()) {
      const searchTerm = req.query.search.trim();
      query.$text = { $search: searchTerm };
    }

    // Only scope by organization for trainers/admins; super_admin can see all courses
    if (req.user.organization && req.user.role !== 'learner' && req.user.role !== 'student' && req.user.role !== 'super_admin') {
      query.organization = req.user.organization;
    }

    let courses;
    try {
      courses = await Course.find(query)
        .populate('trainer', 'email profile')
        .populate('category', 'name slug')
        .populate('modules')
        .sort({ createdAt: -1 });
    } catch (findError) {
      // If $text search fails (e.g. text index missing), retry with regex
      if (req.query.search && req.query.search.trim()) {
        const searchTerm = req.query.search.trim();
        // Remove $text and add $or for regex search
        // MongoDB will automatically AND $or with other query conditions
        const fallbackQuery = { ...query };
        delete fallbackQuery.$text;
        fallbackQuery.$or = [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { tags: { $regex: searchTerm, $options: 'i' } },
        ];
        
        courses = await Course.find(fallbackQuery)
          .populate('trainer', 'email profile')
          .populate('category', 'name slug')
          .populate('modules')
          .sort({ createdAt: -1 });
      } else {
        throw findError;
      }
    }

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    // Log the error for debugging
    console.error('Error in getCourses:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
      userRole: req.user?.role,
    });
    next(error);
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
export const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('trainer', 'email profile')
      .populate({
        path: 'modules',
        populate: [
          { path: 'lessons' },
          { path: 'quiz', select: 'title _id passingScore questions' },
        ],
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private/Trainer
export const createCourse = async (req, res, next) => {
  try {
    // Validate user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
    }

    // Get user ID (Mongoose provides both _id and id)
    const userId = req.user._id || req.user.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found. Please log in again.',
      });
    }

    const {
      title,
      description,
      shortDescription,
      category,
      tags,
      visibility,
      syllabus,
      thumbnail,
      tutorialVideo,
      enrollmentType,
      autoEnroll,
      prerequisites,
      accessDuration,
      isPaid,
      price,
      currency,
      salePrice,
      saleStartDate,
      saleEndDate,
    } = req.body;

    // Ensure trainer is set - use req.body.trainer if provided (for admin), otherwise use current user
    let trainerId = req.body.trainer || userId;
    
    if (!trainerId) {
      return res.status(400).json({
        success: false,
        error: 'Trainer is required. Please ensure you are logged in.',
      });
    }

    // Convert to ObjectId if it's a string
    if (typeof trainerId === 'string') {
      if (!mongoose.Types.ObjectId.isValid(trainerId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid trainer ID format.',
        });
      }
      trainerId = new mongoose.Types.ObjectId(trainerId);
    }

    // Ensure trainerId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(trainerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trainer ID. Please ensure you are logged in correctly.',
      });
    }

    // Prepare course data
    const courseData = {
      title,
      description,
      shortDescription,
      trainer: trainerId, // Explicitly set trainer
      organization: req.user.organization || undefined,
      category: category || null,
      tags: tags || [],
      visibility: visibility || 'public',
      syllabus: syllabus || {},
      thumbnail: thumbnail || undefined,
      tutorialVideo: tutorialVideo?.url
        ? { url: tutorialVideo.url, title: tutorialVideo.title || 'Course tutorial' }
        : undefined,
      enrollmentType: enrollmentType || 'self', // Default to 'self' to allow self-enrollment
      autoEnroll: autoEnroll || false,
      prerequisites: prerequisites || [],
      accessDuration: accessDuration || 0,
      // Pricing fields
      isPaid: isPaid || false,
      price: price || 0,
      currency: currency || 'INR',
      salePrice: salePrice || null,
      saleStartDate: saleStartDate ? new Date(saleStartDate) : null,
      saleEndDate: saleEndDate ? new Date(saleEndDate) : null,
    };

    // Double-check trainer is set
    if (!courseData.trainer) {
      return res.status(400).json({
        success: false,
        error: 'Trainer field is missing. This should not happen. Please contact support.',
      });
    }

    const course = await Course.create(courseData);

    const populatedCourse = await Course.findById(course._id)
      .populate('trainer', 'email profile')
      .populate('category', 'name slug');

    res.status(201).json({
      success: true,
      data: populatedCourse,
    });
  } catch (error) {
    // Provide more specific error messages for validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${errors.join(', ')}`,
        details: error.errors,
      });
    }
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Trainer
export const updateCourse = async (req, res, next) => {
  try {
    // Validate user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
    }

    // Get user ID (Mongoose provides both _id and id)
    const userId = req.user._id || req.user.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found. Please log in again.',
      });
    }

    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    if (
      (!course.trainer || course.trainer.toString() !== userId.toString()) &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this course',
      });
    }

    if (req.user.role === 'admin' && req.user.organization) {
      const courseOrg = course.organization?.toString();
      const adminOrg = req.user.organization.toString();
      if (courseOrg !== adminOrg) {
        return res.status(403).json({
          success: false,
          error: 'Cannot update courses from other organizations',
        });
      }
    }

    const {
      title,
      description,
      shortDescription,
      category,
      tags,
      visibility,
      syllabus,
      thumbnail,
      tutorialVideo,
      status,
      enrollmentType,
      autoEnroll,
      prerequisites,
      accessDuration,
      trainer, // Allow admin to set trainer
      isPaid,
      price,
      currency,
      salePrice,
      saleStartDate,
      saleEndDate,
    } = req.body;

    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (shortDescription !== undefined) course.shortDescription = shortDescription;
    if (category !== undefined) course.category = category || null;
    if (tags) course.tags = tags;
    if (visibility) course.visibility = visibility;
    if (syllabus) course.syllabus = { ...course.syllabus, ...syllabus };
    if (thumbnail !== undefined) course.thumbnail = thumbnail;
    if (tutorialVideo !== undefined) {
      if (tutorialVideo?.url) {
        course.tutorialVideo = { url: tutorialVideo.url, title: tutorialVideo.title || 'Course tutorial' };
      } else {
        course.tutorialVideo = undefined;
      }
    }
    if (status) {
      // Validate course requirements before publishing
      if (status === 'published') {
        const courseWithModules = await Course.findById(req.params.id).populate({
          path: 'modules',
          populate: {
            path: 'lessons',
          },
        });

        if (!courseWithModules.modules || courseWithModules.modules.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Course must have at least one module before publishing',
          });
        }

        const modulesWithLessons = courseWithModules.modules.filter(
          (mod) => mod.lessons && mod.lessons.length > 0
        );
        if (modulesWithLessons.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Course must have at least one module with lessons before publishing',
          });
        }

        let hasVideoLesson = false;
        for (const mod of courseWithModules.modules) {
          if (mod.lessons && mod.lessons.length > 0) {
            for (const lesson of mod.lessons) {
              if (lesson.type === 'video' && lesson.resources?.some((r) => r.type === 'video' && r.url)) {
                hasVideoLesson = true;
                break;
              }
            }
            if (hasVideoLesson) break;
          }
        }

        if (!hasVideoLesson) {
          return res.status(400).json({
            success: false,
            error: 'Course must have at least one video lesson before publishing',
          });
        }
      }
      course.status = status;
    }
    if (enrollmentType) course.enrollmentType = enrollmentType;
    if (autoEnroll !== undefined) course.autoEnroll = autoEnroll;
    if (prerequisites) course.prerequisites = prerequisites;
    if (accessDuration !== undefined) course.accessDuration = accessDuration;
    
    // Pricing fields
    if (isPaid !== undefined) course.isPaid = isPaid;
    if (price !== undefined) course.price = price;
    if (currency) course.currency = currency;
    if (salePrice !== undefined) course.salePrice = salePrice || null;
    if (saleStartDate !== undefined) course.saleStartDate = saleStartDate ? new Date(saleStartDate) : null;
    if (saleEndDate !== undefined) course.saleEndDate = saleEndDate ? new Date(saleEndDate) : null;
    
    if (trainer && ['super_admin', 'admin'].includes(req.user.role)) {
      if (!mongoose.Types.ObjectId.isValid(trainer)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid trainer ID format.',
        });
      }
      if (req.user.role === 'admin' && req.user.organization) {
        const trainerUser = await User.findById(trainer).select('organization').lean();
        if (!trainerUser || trainerUser.organization?.toString() !== req.user.organization.toString()) {
          return res.status(403).json({
            success: false,
            error: 'Can only assign trainers from your organization',
          });
        }
      }
      course.trainer = trainer;
    } else if (!course.trainer) {
      // If trainer is missing, set it to current user (for admin creating courses)
      course.trainer = userId;
    }
    
    // Final validation - ensure trainer is set
    if (!course.trainer) {
      return res.status(400).json({
        success: false,
        error: 'Trainer field is required and cannot be removed.',
      });
    }

    await course.save();

    const populatedCourse = await Course.findById(course._id)
      .populate('trainer', 'email profile')
      .populate('category', 'name slug')
      .populate('modules');

    res.status(200).json({
      success: true,
      data: populatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Trainer
export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    if (
      (!course.trainer || course.trainer.toString() !== req.user._id.toString()) &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this course',
      });
    }

    if (req.user.role === 'admin' && req.user.organization) {
      const courseOrg = course.organization?.toString();
      const adminOrg = req.user.organization.toString();
      if (courseOrg !== adminOrg) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete courses from other organizations',
        });
      }
    }

    // Delete associated modules and lessons
    for (const moduleId of course.modules) {
      const module = await Module.findById(moduleId);
      if (module) {
        await Lesson.deleteMany({ _id: { $in: module.lessons } });
        await module.deleteOne();
      }
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish course
// @route   POST /api/courses/:id/publish
// @access  Private/Trainer/Admin
export const publishCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate({
      path: 'modules',
      populate: {
        path: 'lessons',
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    // Check if user is the trainer or admin
    if (
      (!course.trainer || course.trainer.toString() !== req.user._id.toString()) &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to publish this course',
      });
    }

    // Validate course has modules
    if (!course.modules || course.modules.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Course must have at least one module before publishing',
      });
    }

    // Validate at least one module has lessons
    const modulesWithLessons = course.modules.filter((mod) => mod.lessons && mod.lessons.length > 0);
    if (modulesWithLessons.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Course must have at least one module with lessons before publishing',
      });
    }

    // Validate at least one lesson is a video lesson
    let hasVideoLesson = false;
    for (const mod of course.modules) {
      if (mod.lessons && mod.lessons.length > 0) {
        for (const lesson of mod.lessons) {
          if (lesson.type === 'video' && lesson.resources?.some((r) => r.type === 'video' && r.url)) {
            hasVideoLesson = true;
            break;
          }
        }
        if (hasVideoLesson) break;
      }
    }

    if (!hasVideoLesson) {
      return res.status(400).json({
        success: false,
        error: 'Course must have at least one video lesson before publishing',
      });
    }

    course.status = 'published';
    await course.save();

    const populatedCourse = await Course.findById(course._id)
      .populate('trainer', 'email profile')
      .populate('category', 'name slug')
      .populate('modules');

    res.status(200).json({
      success: true,
      data: populatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add module to course
// @route   POST /api/courses/:id/modules
// @access  Private/Trainer
export const addModule = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    const isTrainer = course.trainer && course.trainer.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isTrainer && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to add modules to this course',
      });
    }

    const { title, description, order } = req.body;

    const module = await Module.create({
      title,
      description,
      course: course._id,
      order: order || course.modules.length,
    });

    course.modules.push(module._id);
    await course.save();

    res.status(201).json({
      success: true,
      data: module,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update module
// @route   PUT /api/courses/:id/modules/:moduleId
// @access  Private/Trainer
export const updateModule = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    const module = await Module.findOne({
      _id: req.params.moduleId,
      course: course._id,
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        error: 'Module not found',
      });
    }

    const isTrainer = course.trainer && course.trainer.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isTrainer && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this module',
      });
    }

    const { title, description, order, releaseDate, releaseAfterDays, isLocked, unlockDate, quiz } = req.body;

    if (title !== undefined) module.title = title;
    if (description !== undefined) module.description = description;
    if (order !== undefined) module.order = order;
    if (releaseDate !== undefined) module.releaseDate = releaseDate ? new Date(releaseDate) : undefined;
    if (releaseAfterDays !== undefined) module.releaseAfterDays = releaseAfterDays;
    if (isLocked !== undefined) module.isLocked = isLocked;
    if (unlockDate !== undefined) module.unlockDate = unlockDate ? new Date(unlockDate) : undefined;
    if (quiz !== undefined) module.quiz = quiz || null;

    await module.save();

    res.json({
      success: true,
      data: module,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete module
// @route   DELETE /api/courses/:id/modules/:moduleId
// @access  Private/Trainer
export const deleteModule = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    const isTrainer = course.trainer && course.trainer.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isTrainer && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this module' });
    }
    const module = await Module.findOne({ _id: req.params.moduleId, course: course._id }).populate('lessons');
    if (!module) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }
    for (const lesson of module.lessons || []) {
      await lesson.deleteOne();
    }
    course.modules = course.modules.filter((id) => id.toString() !== req.params.moduleId);
    await course.save();
    await module.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Create lesson
// @route   POST /api/courses/lessons
// @access  Private/Trainer
export const createLesson = async (req, res, next) => {
  try {
    const {
      title,
      content,
      type,
      moduleId,
      order,
      resources,
      duration,
      videoUrl,
      videoType,
      releaseDate,
      releaseAfterDays,
      isLocked,
      unlockDate,
    } = req.body;

    const module = await Module.findById(moduleId).populate('course');

    if (!module) {
      return res.status(404).json({
        success: false,
        error: 'Module not found',
      });
    }

    // Check if user is the trainer or admin
    if (
      (!module.course.trainer || module.course.trainer.toString() !== req.user._id.toString()) &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to add lessons to this module',
      });
    }

    const lesson = await Lesson.create({
      title,
      content,
      type: type || 'text',
      module: moduleId,
      order: order || module.lessons.length,
      resources: resources || [],
      duration: duration || 0,
      videoUrl: videoUrl || null,
      videoType: videoType || null,
      releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
      releaseAfterDays: releaseAfterDays || 0,
      isLocked: isLocked || false,
      unlockDate: unlockDate ? new Date(unlockDate) : undefined,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          title,
          content,
          type: type || 'text',
          resources: resources || [],
          changedBy: req.user._id,
          changeNote: 'Initial version',
        },
      ],
    });

    module.lessons.push(lesson._id);
    await module.save();

    res.status(201).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lesson (enrolled users only for learners/students)
// @route   GET /api/courses/lessons/:id
// @access  Private
export const getLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate({
      path: 'module',
      populate: { path: 'course' },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
      });
    }

    // Learners/students: must be enrolled in the lesson's course to access
    if (req.user.role === 'learner' || req.user.role === 'student') {
      const Enrollment = (await import('../models/Enrollment.js')).default;
      const enrollment = await Enrollment.findOne({
        user: req.user._id,
        course: lesson.module?.course?._id || lesson.module?.course,
        isActive: true,
        status: { $ne: 'expired' },
      });
      if (!enrollment) {
        return res.status(403).json({
          success: false,
          error: 'You must enroll in this course to access lesson content',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private/Trainer
export const updateLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate({
      path: 'module',
      populate: { path: 'course' },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
      });
    }

    if (
      (!lesson.module.course.trainer || lesson.module.course.trainer.toString() !== req.user._id.toString()) &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this lesson',
      });
    }

    const {
      title,
      content,
      type,
      order,
      resources,
      duration,
      videoUrl,
      videoType,
      releaseDate,
      releaseAfterDays,
      isLocked,
      unlockDate,
      createVersion,
      changeNote,
    } = req.body;

    // Save current state as version if requested
    if (createVersion) {
      const newVersion = {
        version: lesson.currentVersion + 1,
        title: lesson.title,
        content: lesson.content,
        type: lesson.type,
        resources: lesson.resources,
        changedBy: req.user._id,
        changeNote: changeNote || 'Lesson updated',
      };
      lesson.versions.push(newVersion);
      lesson.currentVersion = newVersion.version;
    }

    // Update fields
    if (title !== undefined) lesson.title = title;
    if (content !== undefined) lesson.content = content;
    if (type) lesson.type = type;
    if (order !== undefined) lesson.order = order;
    if (resources) lesson.resources = resources;
    if (duration !== undefined) lesson.duration = duration;
    if (videoUrl !== undefined) lesson.videoUrl = videoUrl || null;
    if (videoType !== undefined) lesson.videoType = videoType || null;
    if (releaseDate) lesson.releaseDate = new Date(releaseDate);
    if (releaseAfterDays !== undefined) lesson.releaseAfterDays = releaseAfterDays;
    if (isLocked !== undefined) lesson.isLocked = isLocked;
    if (unlockDate) lesson.unlockDate = new Date(unlockDate);

    await lesson.save();

    res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private/Trainer
export const deleteLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate({
      path: 'module',
      populate: { path: 'course' },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
      });
    }

    if (
      (!lesson.module.course.trainer || lesson.module.course.trainer.toString() !== req.user._id.toString()) &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this lesson',
      });
    }

    const module = await Module.findById(lesson.module._id);
    module.lessons = module.lessons.filter(
      (id) => id.toString() !== lesson._id.toString()
    );
    await module.save();

    await lesson.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

