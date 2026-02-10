import PlatformSettings from '../models/PlatformSettings.js';
import Organization from '../models/Organization.js';

// @desc    Get platform settings
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getPlatformSettings = async (req, res, next) => {
  try {
    let settings = await PlatformSettings.findOne({
      organization: req.user.organization,
    });

    if (!settings) {
      // Create default settings
      settings = await PlatformSettings.create({
        organization: req.user.organization,
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update platform settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updatePlatformSettings = async (req, res, next) => {
  try {
    let settings = await PlatformSettings.findOne({
      organization: req.user.organization,
    });

    if (!settings) {
      settings = await PlatformSettings.create({
        organization: req.user.organization,
      });
    }

    const {
      siteName,
      siteLogo,
      siteFavicon,
      emailSettings,
      paymentSettings,
      courseSettings,
      userSettings,
      notificationSettings,
      maintenanceMode,
      maintenanceMessage,
    } = req.body;

    if (siteName) settings.siteName = siteName;
    if (siteLogo !== undefined) settings.siteLogo = siteLogo;
    if (siteFavicon !== undefined) settings.siteFavicon = siteFavicon;
    if (emailSettings) settings.emailSettings = { ...settings.emailSettings, ...emailSettings };
    if (paymentSettings) settings.paymentSettings = { ...settings.paymentSettings, ...paymentSettings };
    if (courseSettings) settings.courseSettings = { ...settings.courseSettings, ...courseSettings };
    if (userSettings) settings.userSettings = { ...settings.userSettings, ...userSettings };
    if (notificationSettings) {
      settings.notificationSettings = { ...settings.notificationSettings, ...notificationSettings };
    }
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (maintenanceMessage !== undefined) settings.maintenanceMessage = maintenanceMessage;

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};


