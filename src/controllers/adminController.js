import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Organization from '../models/Organization.js';

const isOrgScopedAdmin = (req) => req.user.role === 'admin' && req.user.organization;

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    let query = {};

    if (isOrgScopedAdmin(req)) {
      query.organization = req.user.organization;
    }
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-password')
      .populate('organization', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('organization', 'name');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (isOrgScopedAdmin(req)) {
      const userOrg = user.organization?._id?.toString() || user.organization?.toString();
      const adminOrg = req.user.organization?.toString();
      if (userOrg !== adminOrg) {
        return res.status(403).json({
          success: false,
          error: 'Cannot access users from other organizations',
        });
      }
    }

    // Get user statistics
    const enrollments = await Enrollment.countDocuments({ user: user._id });
    const courses = await Course.countDocuments({ trainer: user._id });
    const payments = await Payment.countDocuments({ user: user._id, status: 'completed' });
    const subscriptions = await Subscription.countDocuments({ user: user._id, status: 'active' });

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        stats: {
          enrollments,
          courses,
          payments,
          subscriptions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res, next) => {
  try {
    const { role, status, organization, profile } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only Super Admin can update Super Admin users',
      });
    }

    if (isOrgScopedAdmin(req)) {
      const userOrg = user.organization?.toString();
      const adminOrg = req.user.organization?.toString();
      if (userOrg !== adminOrg) {
        return res.status(403).json({
          success: false,
          error: 'Cannot update users from other organizations',
        });
      }
      if (organization && organization.toString() !== adminOrg) {
        return res.status(403).json({
          success: false,
          error: 'Cannot assign users to other organizations',
        });
      }
    }

    // Only Super Admin can assign or change admin role; admins cannot promote to admin
    if (role && ['super_admin', 'admin', 'trainer', 'learner', 'student'].includes(role)) {
      if (role === 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Only Super Admin can assign or change Admin role',
        });
      }
      if (role === 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Super Admin role cannot be assigned',
        });
      }
      user.role = role;
    }
    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      user.status = status;
    }
    if (organization && req.user.role === 'super_admin') {
      user.organization = organization;
    } else if (organization && isOrgScopedAdmin(req) && organization.toString() === req.user.organization.toString()) {
      user.organization = organization;
    }
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organization', 'name');

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete Super Admin',
      });
    }
    if (user.role === 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only Super Admin can delete Admin users',
      });
    }

    if (isOrgScopedAdmin(req)) {
      const userOrg = user.organization?.toString();
      const adminOrg = req.user.organization?.toString();
      if (userOrg !== adminOrg) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete users from other organizations',
        });
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get courses pending approval
// @route   GET /api/admin/courses/pending
// @access  Private/Admin
export const getPendingCourses = async (req, res, next) => {
  try {
    const query = { status: 'draft' };
    if (isOrgScopedAdmin(req)) query.organization = req.user.organization;
    const courses = await Course.find(query)
      .populate('trainer', 'email profile')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve course
// @route   POST /api/admin/courses/:id/approve
// @access  Private/Admin
export const approveCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    if (isOrgScopedAdmin(req)) {
      const courseOrg = course.organization?.toString();
      const adminOrg = req.user.organization?.toString();
      if (courseOrg !== adminOrg) {
        return res.status(403).json({
          success: false,
          error: 'Cannot approve courses from other organizations',
        });
      }
    }

    course.status = 'published';
    await course.save();

    const updatedCourse = await Course.findById(course._id)
      .populate('trainer', 'email profile')
      .populate('category', 'name');

    res.status(200).json({
      success: true,
      data: updatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject course
// @route   POST /api/admin/courses/:id/reject
// @access  Private/Admin
export const rejectCourse = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    if (isOrgScopedAdmin(req)) {
      const courseOrg = course.organization?.toString();
      const adminOrg = req.user.organization?.toString();
      if (courseOrg !== adminOrg) {
        return res.status(403).json({
          success: false,
          error: 'Cannot reject courses from other organizations',
        });
      }
    }

    course.status = 'draft';
    // Store rejection reason in a metadata field if needed
    await course.save();

    res.status(200).json({
      success: true,
      data: course,
      message: reason || 'Course rejected',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform statistics
// @route   GET /api/admin/statistics
// @access  Private/Admin
export const getPlatformStatistics = async (req, res, next) => {
  try {
    const orgFilter = isOrgScopedAdmin(req) ? { organization: req.user.organization } : {};
    const orgCourseFilter = isOrgScopedAdmin(req) ? { organization: req.user.organization } : {};

    const totalUsers = await User.countDocuments(orgFilter);
    const totalCourses = await Course.countDocuments(orgCourseFilter);

    let totalEnrollments;
    let totalPayments;
    let revenue = 0;
    if (isOrgScopedAdmin(req)) {
      const orgCourseIds = (await Course.find(orgCourseFilter).select('_id')).map((c) => c._id);
      totalEnrollments = await Enrollment.countDocuments({ course: { $in: orgCourseIds } });
      totalPayments = await Payment.countDocuments({
        status: 'completed',
        course: { $in: orgCourseIds },
      });
      const revAgg = await Payment.aggregate([
        { $match: { status: 'completed', course: { $in: orgCourseIds } } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]);
      revenue = revAgg.length > 0 ? revAgg[0].total : 0;
    } else {
      totalEnrollments = await Enrollment.countDocuments();
      totalPayments = await Payment.countDocuments({ status: 'completed' });
      const totalRevenue = await Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]);
      revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
    }

    const usersByRole = await User.aggregate([
      ...(Object.keys(orgFilter).length ? [{ $match: orgFilter }] : []),
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const coursesByStatus = await Course.aggregate([
      ...(Object.keys(orgCourseFilter).length ? [{ $match: orgCourseFilter }] : []),
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalEnrollments,
          totalPayments,
          totalRevenue: Math.round(revenue * 100) / 100,
        },
        usersByRole,
        coursesByStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};


