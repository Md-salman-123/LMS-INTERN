import AuditLog from '../models/AuditLog.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, resource, userId, from, to } = req.query;
    const query = {};

    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (userId) query.user = userId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await AuditLog.find(query)
      .populate('user', 'email profile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

export const createAuditLog = async (data) => {
  try {
    await AuditLog.create(data);
  } catch (err) {
    console.error('Audit log create error:', err);
  }
};
