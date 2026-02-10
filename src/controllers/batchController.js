import Batch from '../models/Batch.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

// @desc    Get all batches
// @route   GET /api/batches
// @access  Private
export const getBatches = async (req, res, next) => {
  try {
    let query = {};

    if (req.query.course) {
      query.course = req.query.course;
    }

    if (req.user.organization) {
      query.organization = req.user.organization;
    }

    const batches = await Batch.find(query)
      .populate('course', 'title description')
      .populate('instructor', 'email profile')
      .populate('createdBy', 'email profile')
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single batch
// @route   GET /api/batches/:id
// @access  Private
export const getBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('course', 'title description')
      .populate('instructor', 'email profile')
      .populate('createdBy', 'email profile');

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    // Get enrollment count
    const enrollmentCount = await Enrollment.countDocuments({ batch: batch._id });

    res.status(200).json({
      success: true,
      data: {
        ...batch.toObject(),
        enrollmentCount,
        availableSpots: batch.maxCapacity > 0 ? batch.maxCapacity - enrollmentCount : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create batch
// @route   POST /api/batches
// @access  Private/Admin/Trainer
export const createBatch = async (req, res, next) => {
  try {
    const {
      name,
      description,
      course,
      startDate,
      endDate,
      maxCapacity,
      instructor,
      enrollmentType,
      autoEnroll,
    } = req.body;

    // Verify course exists
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        error: 'Course not found',
      });
    }

    // Check authorization
    if (
      courseDoc.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create batch for this course',
      });
    }

    const batch = await Batch.create({
      name,
      description,
      course,
      organization: req.user.organization,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      maxCapacity: maxCapacity || 0,
      instructor: instructor || courseDoc.trainer,
      enrollmentType: enrollmentType || 'manual',
      autoEnroll: autoEnroll || false,
      createdBy: req.user._id,
    });

    const populatedBatch = await Batch.findById(batch._id)
      .populate('course', 'title description')
      .populate('instructor', 'email profile');

    res.status(201).json({
      success: true,
      data: populatedBatch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch
// @route   PUT /api/batches/:id
// @access  Private/Admin/Trainer
export const updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('course');

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    // Check authorization
    if (
      batch.course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this batch',
      });
    }

    const {
      name,
      description,
      startDate,
      endDate,
      maxCapacity,
      instructor,
      status,
      enrollmentType,
      autoEnroll,
    } = req.body;

    if (name) batch.name = name;
    if (description !== undefined) batch.description = description;
    if (startDate) batch.startDate = new Date(startDate);
    if (endDate !== undefined) batch.endDate = endDate ? new Date(endDate) : undefined;
    if (maxCapacity !== undefined) batch.maxCapacity = maxCapacity;
    if (instructor) batch.instructor = instructor;
    if (status) batch.status = status;
    if (enrollmentType) batch.enrollmentType = enrollmentType;
    if (autoEnroll !== undefined) batch.autoEnroll = autoEnroll;

    await batch.save();

    const populatedBatch = await Batch.findById(batch._id)
      .populate('course', 'title description')
      .populate('instructor', 'email profile');

    res.status(200).json({
      success: true,
      data: populatedBatch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete batch
// @route   DELETE /api/batches/:id
// @access  Private/Admin/Trainer
export const deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('course');

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    // Check authorization
    if (
      batch.course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this batch',
      });
    }

    // Check if batch has enrollments
    const enrollmentCount = await Enrollment.countDocuments({ batch: batch._id });
    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete batch. It has ${enrollmentCount} enrollment(s).`,
      });
    }

    await batch.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get batch enrollments
// @route   GET /api/batches/:id/enrollments
// @access  Private
export const getBatchEnrollments = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    const enrollments = await Enrollment.find({ batch: batch._id })
      .populate('user', 'email profile')
      .populate('course', 'title')
      .sort({ enrolledAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};


