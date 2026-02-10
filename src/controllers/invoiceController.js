import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';

// @desc    Get user invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res, next) => {
  try {
    let query = {};

    // If not admin, only show own invoices
    if (req.user.role === 'learner') {
      query.user = req.user._id;
    } else if (req.query.userId) {
      query.user = req.query.userId;
    }

    const invoices = await Invoice.find(query)
      .populate('user', 'email profile')
      .populate('payment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('user', 'email profile')
      .populate('payment');

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Check authorization
    if (
      invoice.user._id.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this invoice',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/download
// @access  Private
export const downloadInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Check authorization
    if (
      invoice.user.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to download this invoice',
      });
    }

    // TODO: Generate PDF using pdfkit
    // For now, return invoice data
    res.status(200).json({
      success: true,
      data: invoice,
      message: 'PDF generation not yet implemented',
    });
  } catch (error) {
    next(error);
  }
};


