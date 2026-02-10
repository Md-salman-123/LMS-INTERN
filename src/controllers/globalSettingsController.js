import GlobalSettings from '../models/GlobalSettings.js';

export const getGlobalSettings = async (req, res, next) => {
  try {
    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = await GlobalSettings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateGlobalSettings = async (req, res, next) => {
  try {
    let settings = await GlobalSettings.findOne();
    if (!settings) settings = await GlobalSettings.create({});

    const { branding, domain, language, security } = req.body;
    if (branding) settings.branding = { ...settings.branding, ...branding };
    if (domain) settings.domain = { ...settings.domain, ...domain };
    if (language) settings.language = { ...settings.language, ...language };
    if (security) {
      settings.security = { ...settings.security, ...security };
      if (security.accessRules) {
        settings.security.accessRules = { ...settings.security.accessRules, ...security.accessRules };
      }
    }

    await settings.save();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
