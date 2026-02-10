import Organization from '../models/Organization.js';
import { uploadSingle } from '../middleware/fileUpload.js';
import path from 'path';
import fs from 'fs';

/** Resolve org to use: user's org when set, else first org (legacy). For org-scoped admin, always user's org. */
async function resolveOrganization(req) {
  if (req.user?.organization) {
    const org = await Organization.findById(req.user.organization);
    return org;
  }
  return Organization.findOne();
}

// @desc    Get organization settings (user's org when user has organization, else first org)
// @route   GET /api/organization
// @access  Private
export const getOrganization = async (req, res, next) => {
  try {
    let organization = await resolveOrganization(req);

    if (!organization) {
      if (req.user?.organization) {
        return res.status(404).json({
          success: false,
          error: 'Your organization was not found',
        });
      }
      organization = await Organization.create({
        name: 'Default Organization',
      });
    }

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organization (user's org for admin; first org for super_admin without org)
// @route   PUT /api/organization
// @access  Private/Admin
export const updateOrganization = async (req, res, next) => {
  try {
    if (req.user.role === 'admin' && !req.user.organization) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not assigned to an organization',
      });
    }

    let organization = await resolveOrganization(req);

    if (!organization) {
      if (req.user?.organization) {
        return res.status(404).json({ success: false, error: 'Your organization was not found' });
      }
      organization = await Organization.create({
        name: req.body.name || 'Default Organization',
        settings: req.body.settings || {},
      });
    } else {
      if (req.body.name) organization.name = req.body.name;
      if (req.body.settings) {
        organization.settings = { ...organization.settings, ...req.body.settings };
      }
      await organization.save();
    }

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload organization logo (user's org for admin)
// @route   POST /api/organization/logo
// @access  Private/Admin
export const uploadLogo = async (req, res, next) => {
  uploadSingle('logo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    try {
      if (req.user.role === 'admin' && !req.user.organization) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not assigned to an organization',
        });
      }

      let organization = await resolveOrganization(req);

      if (!organization) {
        if (req.user?.organization) {
          return res.status(404).json({ success: false, error: 'Your organization was not found' });
        }
        organization = await Organization.create({
          name: 'Default Organization',
          logo: req.file.filename,
        });
      } else {
        if (organization.logo) {
          const oldLogoPath = path.join(process.env.UPLOAD_PATH || './uploads', organization.logo);
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }
        organization.logo = req.file.filename;
        await organization.save();
      }

      res.status(200).json({
        success: true,
        data: {
          logo: req.file.filename,
          logoUrl: `/uploads/${req.file.filename}`,
        },
      });
    } catch (error) {
      next(error);
    }
  });
};

// @desc    Update theme (user's org for admin)
// @route   PUT /api/organization/theme
// @access  Private/Admin
export const updateTheme = async (req, res, next) => {
  try {
    const { primaryColor, secondaryColor } = req.body;

    if (req.user.role === 'admin' && !req.user.organization) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not assigned to an organization',
      });
    }

    let organization = await resolveOrganization(req);

    if (!organization) {
      if (req.user?.organization) {
        return res.status(404).json({ success: false, error: 'Your organization was not found' });
      }
      organization = await Organization.create({
        name: 'Default Organization',
        theme: {
          primaryColor: primaryColor || '#3b82f6',
          secondaryColor: secondaryColor || '#64748b',
        },
      });
    } else {
      if (!organization.theme) organization.theme = {};
      if (primaryColor) organization.theme.primaryColor = primaryColor;
      if (secondaryColor) organization.theme.secondaryColor = secondaryColor;
      await organization.save();
    }

    res.status(200).json({
      success: true,
      data: organization.theme,
    });
  } catch (error) {
    next(error);
  }
};

