import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';
import Course from '../models/Course.js';
import path from 'path';
import fs from 'fs';

// @desc    Upload file for lesson
// @route   POST /api/content/upload
// @access  Private/Trainer
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    // Determine file type
    let fileType = 'file';
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (['.mp4', '.webm', '.ogg', '.avi', '.mov'].includes(ext)) {
      fileType = 'video';
    } else if (ext === '.pdf') {
      fileType = 'pdf';
    } else if (['.ppt', '.pptx'].includes(ext)) {
      fileType = 'ppt';
    } else if (['.doc', '.docx', '.xls', '.xlsx', '.txt'].includes(ext)) {
      fileType = 'document';
    }

    res.status(200).json({
      success: true,
      data: {
        type: fileType,
        url: fileUrl,
        name: req.file.originalname,
        size: fileSize,
        mimeType: mimeType,
        filename: req.file.filename,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lesson with version history
// @route   GET /api/lessons/:id/versions
// @access  Private
export const getLessonVersions = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('versions.changedBy', 'email profile')
      .select('versions currentVersion title');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        currentVersion: lesson.currentVersion,
        versions: lesson.versions.sort((a, b) => b.version - a.version),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore lesson version
// @route   POST /api/lessons/:id/versions/:versionId/restore
// @access  Private/Trainer
export const restoreLessonVersion = async (req, res, next) => {
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

    // Check authorization
    if (lesson.module.course.trainer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to restore this lesson version',
      });
    }

    const versionToRestore = lesson.versions.find(
      (v) => v._id.toString() === req.params.versionId
    );

    if (!versionToRestore) {
      return res.status(404).json({
        success: false,
        error: 'Version not found',
      });
    }

    // Create new version from current state before restoring
    const newVersion = {
      version: lesson.currentVersion + 1,
      title: lesson.title,
      content: lesson.content,
      type: lesson.type,
      resources: lesson.resources,
      changedBy: req.user._id,
      changeNote: `Restored from version ${versionToRestore.version}`,
    };

    lesson.versions.push(newVersion);
    lesson.currentVersion = newVersion.version;

    // Restore from version
    lesson.title = versionToRestore.title;
    lesson.content = versionToRestore.content;
    lesson.type = versionToRestore.type;
    lesson.resources = versionToRestore.resources;

    await lesson.save();

    res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available lessons for user (considering drip learning)
// @route   GET /api/lessons/available/:courseId
// @access  Private
export const getAvailableLessons = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate({
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

    // Check enrollment
    const Enrollment = (await import('../models/Enrollment.js')).default;
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: 'You are not enrolled in this course',
      });
    }

    const enrollmentDate = enrollment.createdAt;
    const now = new Date();

    // Filter lessons based on drip learning schedule
    const availableLessons = [];
    course.modules.forEach((module) => {
      const moduleReleaseDate = new Date(module.releaseDate);
      const moduleDaysSinceEnrollment = Math.floor(
        (now - enrollmentDate) / (1000 * 60 * 60 * 24)
      );

      let moduleAvailable = true;
      if (module.releaseAfterDays > 0) {
        moduleAvailable = moduleDaysSinceEnrollment >= module.releaseAfterDays;
      }
      if (module.isLocked && module.unlockDate) {
        moduleAvailable = now >= new Date(module.unlockDate);
      }

      if (moduleAvailable) {
        module.lessons.forEach((lesson) => {
          const lessonReleaseDate = new Date(lesson.releaseDate);
          const lessonDaysSinceEnrollment = Math.floor(
            (now - enrollmentDate) / (1000 * 60 * 60 * 24)
          );

          let lessonAvailable = true;
          if (lesson.releaseAfterDays > 0) {
            lessonAvailable = lessonDaysSinceEnrollment >= lesson.releaseAfterDays;
          }
          if (lesson.isLocked && lesson.unlockDate) {
            lessonAvailable = now >= new Date(lesson.unlockDate);
          }

          if (lessonAvailable) {
            availableLessons.push({
              lessonId: lesson._id,
              moduleId: module._id,
              title: lesson.title,
              type: lesson.type,
              duration: lesson.duration,
              order: lesson.order,
            });
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        enrollmentDate,
        availableLessons,
        totalLessons: course.modules.reduce(
          (sum, m) => sum + m.lessons.length,
          0
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete uploaded file
// @route   DELETE /api/content/files/:filename
// @access  Private/Trainer
export const deleteFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const filePath = path.join(uploadPath, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }
  } catch (error) {
    next(error);
  }
};


