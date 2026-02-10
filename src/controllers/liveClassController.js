import LiveClass from '../models/LiveClass.js';
import Attendance from '../models/Attendance.js';
import Recording from '../models/Recording.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import crypto from 'crypto';

// @desc    Get live classes for a course
// @route   GET /api/live-classes/course/:courseId
// @access  Private
export const getCourseLiveClasses = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { status, upcoming } = req.query;

    let query = { course: courseId };

    if (status) {
      query.status = status;
    } else if (upcoming === 'true') {
      query.scheduledStart = { $gte: new Date() };
      query.status = { $in: ['scheduled', 'live'] };
    }

    const liveClasses = await LiveClass.find(query)
      .populate('instructor', 'email profile')
      .populate('course', 'title')
      .sort({ scheduledStart: 1 });

    // Get attendance counts
    const classesWithStats = await Promise.all(
      liveClasses.map(async (liveClass) => {
        const attendanceCount = await Attendance.countDocuments({
          liveClass: liveClass._id,
          status: 'present',
        });
        const recordingCount = await Recording.countDocuments({
          liveClass: liveClass._id,
          status: 'ready',
        });
        return {
          ...liveClass.toObject(),
          attendanceCount,
          recordingCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: classesWithStats.length,
      data: classesWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single live class
// @route   GET /api/live-classes/:id
// @access  Private
export const getLiveClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate('instructor', 'email profile')
      .populate('course', 'title description');

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
        error: 'You must be enrolled in this course to view live classes',
      });
    }

    // Get attendance
    const attendance = await Attendance.findOne({
      liveClass: liveClass._id,
      user: req.user._id,
    });

    // Get recordings
    const recordings = await Recording.find({
      liveClass: liveClass._id,
      status: 'ready',
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...liveClass.toObject(),
        attendance,
        recordings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create live class
// @route   POST /api/live-classes
// @access  Private/Trainer/Admin
export const createLiveClass = async (req, res, next) => {
  try {
    const {
      course,
      title,
      description,
      scheduledStart,
      scheduledEnd,
      duration,
      platform,
      maxParticipants,
      allowRecording,
      requireRegistration,
      attendanceRequired,
    } = req.body;

    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // Only trainer/admin can create live classes
    if (
      courseDoc.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Only instructors can create live classes',
      });
    }

    // Generate meeting room ID for WebRTC
    const meetingRoomId = `room-${crypto.randomBytes(8).toString('hex')}`;
    const meetingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/live-class/${meetingRoomId}`;

    // TODO: If platform is Zoom, integrate with Zoom API here
    // For now, we'll use WebRTC with a meeting room ID

    const liveClass = await LiveClass.create({
      course,
      title,
      description,
      instructor: req.user._id,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      duration: duration || Math.round((new Date(scheduledEnd) - new Date(scheduledStart)) / 60000),
      platform: platform || 'webrtc',
      meetingRoomId,
      meetingUrl,
      maxParticipants: maxParticipants || 100,
      allowRecording: allowRecording !== undefined ? allowRecording : true,
      requireRegistration: requireRegistration || false,
      attendanceRequired: attendanceRequired !== undefined ? attendanceRequired : true,
    });

    const populatedLiveClass = await LiveClass.findById(liveClass._id)
      .populate('instructor', 'email profile')
      .populate('course', 'title');

    res.status(201).json({
      success: true,
      data: populatedLiveClass,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update live class
// @route   PUT /api/live-classes/:id
// @access  Private/Trainer/Admin
export const updateLiveClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({ success: false, error: 'Live class not found' });
    }

    // Check authorization
    const course = await Course.findById(liveClass.course);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this live class',
      });
    }

    const {
      title,
      description,
      scheduledStart,
      scheduledEnd,
      duration,
      platform,
      maxParticipants,
      allowRecording,
      requireRegistration,
      attendanceRequired,
      status,
    } = req.body;

    if (title) liveClass.title = title;
    if (description !== undefined) liveClass.description = description;
    if (scheduledStart) liveClass.scheduledStart = new Date(scheduledStart);
    if (scheduledEnd) liveClass.scheduledEnd = new Date(scheduledEnd);
    if (duration) liveClass.duration = duration;
    if (platform) liveClass.platform = platform;
    if (maxParticipants) liveClass.maxParticipants = maxParticipants;
    if (allowRecording !== undefined) liveClass.allowRecording = allowRecording;
    if (requireRegistration !== undefined) liveClass.requireRegistration = requireRegistration;
    if (attendanceRequired !== undefined) liveClass.attendanceRequired = attendanceRequired;
    if (status && ['scheduled', 'live', 'completed', 'cancelled'].includes(status)) {
      liveClass.status = status;
      if (status === 'live' && !liveClass.actualStartTime) {
        liveClass.actualStartTime = new Date();
      }
      if (status === 'completed' && !liveClass.actualEndTime) {
        liveClass.actualEndTime = new Date();
      }
    }

    await liveClass.save();

    const populatedLiveClass = await LiveClass.findById(liveClass._id)
      .populate('instructor', 'email profile')
      .populate('course', 'title');

    res.status(200).json({
      success: true,
      data: populatedLiveClass,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete live class
// @route   DELETE /api/live-classes/:id
// @access  Private/Trainer/Admin
export const deleteLiveClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({ success: false, error: 'Live class not found' });
    }

    // Check authorization
    const course = await Course.findById(liveClass.course);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this live class',
      });
    }

    // Delete related records
    await Attendance.deleteMany({ liveClass: liveClass._id });
    await Recording.deleteMany({ liveClass: liveClass._id });

    await liveClass.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join live class
// @route   POST /api/live-classes/:id/join
// @access  Private
export const joinLiveClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate('course');

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
        error: 'You must be enrolled in this course to join live classes',
      });
    }

    // Check if class is live or about to start
    const now = new Date();
    const startTime = new Date(liveClass.scheduledStart);
    const timeUntilStart = startTime - now;

    if (liveClass.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'This live class has been cancelled',
      });
    }

    if (liveClass.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'This live class has already ended',
      });
    }

    // Update status to live if it's time
    if (liveClass.status === 'scheduled' && timeUntilStart <= 0) {
      liveClass.status = 'live';
      liveClass.actualStartTime = liveClass.actualStartTime || new Date();
      await liveClass.save();
    }

    // Create or update attendance
    let attendance = await Attendance.findOne({
      liveClass: liveClass._id,
      user: req.user._id,
    });

    if (!attendance) {
      attendance = await Attendance.create({
        liveClass: liveClass._id,
        user: req.user._id,
        status: 'present',
        joinedAt: new Date(),
        checkInTime: new Date(),
      });
    } else if (attendance.status === 'absent') {
      attendance.status = 'present';
      attendance.joinedAt = attendance.joinedAt || new Date();
      attendance.checkInTime = attendance.checkInTime || new Date();
      await attendance.save();
    }

    // Increment participants count
    liveClass.participantsCount = (liveClass.participantsCount || 0) + 1;
    await liveClass.save();

    res.status(200).json({
      success: true,
      data: {
        liveClass,
        attendance,
        joinUrl: liveClass.meetingUrl || liveClass.zoomJoinUrl,
        meetingRoomId: liveClass.meetingRoomId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave live class
// @route   POST /api/live-classes/:id/leave
// @access  Private
export const leaveLiveClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({ success: false, error: 'Live class not found' });
    }

    const attendance = await Attendance.findOne({
      liveClass: liveClass._id,
      user: req.user._id,
    });

    if (attendance) {
      attendance.leftAt = new Date();
      attendance.checkOutTime = new Date();
      if (attendance.joinedAt) {
        const duration = Math.round((new Date() - attendance.joinedAt) / 60000);
        attendance.duration = (attendance.duration || 0) + duration;
      }
      await attendance.save();
    }

    // Decrement participants count
    if (liveClass.participantsCount > 0) {
      liveClass.participantsCount -= 1;
      await liveClass.save();
    }

    res.status(200).json({
      success: true,
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance for a live class
// @route   GET /api/live-classes/:id/attendance
// @access  Private/Trainer/Admin
export const getAttendance = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({ success: false, error: 'Live class not found' });
    }

    // Check authorization
    const course = await Course.findById(liveClass.course);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view attendance',
      });
    }

    const attendance = await Attendance.find({ liveClass: liveClass._id })
      .populate('user', 'email profile')
      .populate('markedBy', 'email profile')
      .sort({ joinedAt: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark attendance manually
// @route   POST /api/live-classes/:id/attendance
// @access  Private/Trainer/Admin
export const markAttendance = async (req, res, next) => {
  try {
    const { userId, status, notes } = req.body;
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({ success: false, error: 'Live class not found' });
    }

    // Check authorization
    const course = await Course.findById(liveClass.course);
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to mark attendance',
      });
    }

    let attendance = await Attendance.findOne({
      liveClass: liveClass._id,
      user: userId,
    });

    if (attendance) {
      attendance.status = status;
      attendance.markedBy = req.user._id;
      attendance.markedAt = new Date();
      if (notes) attendance.notes = notes;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        liveClass: liveClass._id,
        user: userId,
        status: status,
        markedBy: req.user._id,
        markedAt: new Date(),
        notes: notes || '',
      });
    }

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('user', 'email profile')
      .populate('markedBy', 'email profile');

    res.status(200).json({
      success: true,
      data: populatedAttendance,
    });
  } catch (error) {
    next(error);
  }
};


