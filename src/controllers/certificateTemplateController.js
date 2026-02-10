import CertificateTemplate from '../models/CertificateTemplate.js';

// @desc    Get all certificate templates
// @route   GET /api/certificate-templates
// @access  Private/Admin
export const getTemplates = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.organization) {
      query.organization = req.user.organization;
    }

    const templates = await CertificateTemplate.find(query)
      .populate('createdBy', 'email profile')
      .sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single template
// @route   GET /api/certificate-templates/:id
// @access  Private/Admin
export const getTemplate = async (req, res, next) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create certificate template
// @route   POST /api/certificate-templates
// @access  Private/Admin
export const createTemplate = async (req, res, next) => {
  try {
    const { name, description, design, content, isDefault } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await CertificateTemplate.updateMany(
        { organization: req.user.organization, isDefault: true },
        { isDefault: false }
      );
    }

    const template = await CertificateTemplate.create({
      name,
      description,
      design: design || {},
      content: content || {},
      isDefault: isDefault || false,
      organization: req.user.organization,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update certificate template
// @route   PUT /api/certificate-templates/:id
// @access  Private/Admin
export const updateTemplate = async (req, res, next) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    const { name, description, design, content, isDefault, isActive } = req.body;

    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (design) template.design = { ...template.design, ...design };
    if (content) template.content = { ...template.content, ...content };
    if (isActive !== undefined) template.isActive = isActive;

    // If setting as default, unset other defaults
    if (isDefault && !template.isDefault) {
      await CertificateTemplate.updateMany(
        { organization: req.user.organization, isDefault: true },
        { isDefault: false }
      );
      template.isDefault = true;
    } else if (isDefault === false) {
      template.isDefault = false;
    }

    await template.save();

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete certificate template
// @route   DELETE /api/certificate-templates/:id
// @access  Private/Admin
export const deleteTemplate = async (req, res, next) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (template.isDefault) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete default template. Set another template as default first.',
      });
    }

    await template.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};


