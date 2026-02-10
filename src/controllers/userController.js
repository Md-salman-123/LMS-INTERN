import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ organization: req.user.organization })
      .select('-password')
      .populate('organization', 'name');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('organization', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res, next) => {
  try {
    const { email, role, profile, organization } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update fields
    if (email) user.email = email;
    if (role) user.role = role;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (organization) user.organization = organization;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status
// @route   PUT /api/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be active or inactive',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
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

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('organization', 'name logo theme');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
export const updateCurrentUser = async (req, res, next) => {
  try {
    const { profile, password, currentPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update profile
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    // Update password if provided
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password is required to change password',
        });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      user.password = password;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        displayRole: user.displayRole,
        status: user.status,
        profile: user.profile,
        organization: user.organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user avatar
// @route   PUT /api/users/me/avatar
// @access  Private
export const updateAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (avatar) {
      user.profile = { ...user.profile, avatar };
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        avatar: user.profile.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

