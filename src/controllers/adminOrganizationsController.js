import Organization from '../models/Organization.js';
import User from '../models/User.js';

export const listOrganizations = async (req, res, next) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
    const withCounts = await Promise.all(
      orgs.map(async (org) => {
        const userCount = await User.countDocuments({ organization: org._id });
        return { ...org, userCount };
      })
    );
    res.status(200).json({ success: true, data: withCounts });
  } catch (error) {
    next(error);
  }
};

export const createOrganization = async (req, res, next) => {
  try {
    const { name, logo, theme, settings } = req.body;
    const org = await Organization.create({
      name: name || 'New Organization',
      logo: logo || '',
      theme: theme || { primaryColor: '#3b82f6', secondaryColor: '#64748b' },
      settings: settings || {},
    });
    res.status(201).json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

export const updateOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, error: 'Organization not found' });

    const { name, logo, theme, settings } = req.body;
    if (name != null) org.name = name;
    if (logo != null) org.logo = logo;
    if (theme) org.theme = { ...org.theme, ...theme };
    if (settings) org.settings = { ...org.settings, ...settings };
    await org.save();

    res.status(200).json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};
