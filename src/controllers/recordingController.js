import Recording from '../models/Recording.js';
import LiveClass from '../models/LiveClass.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get recordings for a live class
// @route   GET /api/recordings/live-class/:liveClassId
// @access  Private
export const getLiveClassRecordings = async (req, res, next) => {
  try {
    const { liveClassId } = req.params;

    const liveClass = await LiveClass.findById(liveClassId).populate('course');

    if (!liveClass) {
      return res.status(404).json({ success: false, error: 'Live class not found' });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: liveClass.course._id,
    });

    const course = await Course.findById(liveClass.course._id);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role) &&
      !enrollment
    ) {
      return res.status(403).json({
        success: false,
        error: 'You must be enrolled in this course to view recordings',
      });
    }

    const recordings = await Recording.find({
      liveClass: liveClassId,
      status: 'ready',
    })
      .populate('uploadedBy', 'email profile')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: recordings.length,
      data: recordings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single recording
// @route   GET /api/recordings/:id
// @access  Private
export const getRecording = async (req, res, next) => {
  try {
    const recording = await Recording.findById(req.params.id)
      .populate('liveClass')
      .populate('uploadedBy', 'email profile');

    if (!recording) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    const liveClass = await LiveClass.findById(recording.liveClass._id).populate('course');

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: liveClass.course._id,
    });

    const course = await Course.findById(liveClass.course._id);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role) &&
      !enrollment
    ) {
      return res.status(403).json({
        success: false,
        error: 'You must be enrolled in this course to view recordings',
      });
    }

    // Increment views
    recording.views += 1;
    await recording.save();

    res.status(200).json({
      success: true,
      data: recording,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Upload recording
// @route   POST /api/recordings
// @access  Private/Trainer/Admin
export const createRecording = async (req, res, next) => {
  try {
    const {
      liveClass,
      title,
      description,
      fileUrl,
      fileSize,
      duration,
      format,
      platformRecordingId,
      thumbnailUrl,
      recordedAt,
    } = req.body;

    const liveClassDoc = await LiveClass.findById(liveClass).populate('course');

    if (!liveClassDoc) {
      return res.status(404).json({ success: false, error: 'Live class not found' });
    }

    // Check authorization
    const course = await Course.findById(liveClassDoc.course._id);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Only instructors can upload recordings',
      });
    }

    const recording = await Recording.create({
      liveClass,
      title: title || `Recording - ${liveClassDoc.title}`,
      description,
      fileUrl,
      fileSize,
      duration,
      format: format || 'mp4',
      platformRecordingId,
      thumbnailUrl,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      uploadedBy: req.user._id,
      status: 'ready',
    });

    // Update live class
    liveClassDoc.recordingAvailable = true;
    liveClassDoc.recordingUrl = fileUrl;
    await liveClassDoc.save();

    const populatedRecording = await Recording.findById(recording._id)
      .populate('liveClass')
      .populate('uploadedBy', 'email profile');

    res.status(201).json({
      success: true,
      data: populatedRecording,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update recording
// @route   PUT /api/recordings/:id
// @access  Private/Trainer/Admin
export const updateRecording = async (req, res, next) => {
  try {
    const recording = await Recording.findById(req.params.id).populate('liveClass');

    if (!recording) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    // Check authorization
    const liveClass = await LiveClass.findById(recording.liveClass._id).populate('course');
    const course = await Course.findById(liveClass.course._id);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this recording',
      });
    }

    const { title, description, isPublic, status } = req.body;

    if (title) recording.title = title;
    if (description !== undefined) recording.description = description;
    if (isPublic !== undefined) recording.isPublic = isPublic;
    if (status) recording.status = status;

    await recording.save();

    const populatedRecording = await Recording.findById(recording._id)
      .populate('liveClass')
      .populate('uploadedBy', 'email profile');

    res.status(200).json({
      success: true,
      data: populatedRecording,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete recording
// @route   DELETE /api/recordings/:id
// @access  Private/Trainer/Admin
export const deleteRecording = async (req, res, next) => {
  try {
    const recording = await Recording.findById(req.params.id).populate('liveClass');

    if (!recording) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    // Check authorization
    const liveClass = await LiveClass.findById(recording.liveClass._id).populate('course');
    const course = await Course.findById(liveClass.course._id);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this recording',
      });
    }

    await recording.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};


