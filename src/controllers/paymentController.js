import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Coupon from '../models/Coupon.js';
import Course from '../models/Course.js';
import Subscription from '../models/Subscription.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Create payment intent (for one-time course purchase)
// @route   POST /api/payments/create-intent
// @access  Private
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { courseId, couponCode } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    if (!course.isPaid) {
      return res.status(400).json({
        success: false,
        error: 'This course is free',
      });
    }

    // Calculate price
    let price = course.price;
    const now = new Date();
    if (course.salePrice && course.saleStartDate && course.saleEndDate) {
      if (now >= course.saleStartDate && now <= course.saleEndDate) {
        price = course.salePrice;
      }
    }

    // Apply coupon if provided
    let discountAmount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon && coupon.isValid()) {
        // Check if coupon is applicable
        if (
          coupon.applicableTo === 'all' ||
          coupon.applicableTo === 'courses' ||
          (coupon.applicableTo === 'specific_courses' &&
            coupon.courses.some((id) => id.toString() === courseId))
        ) {
          discountAmount = coupon.calculateDiscount(price);
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired coupon code',
        });
      }
    }

    const finalAmount = Math.max(0, price - discountAmount);

    // Create payment record
    const payment = await Payment.create({
      user: req.user._id,
      type: 'course_purchase',
      course: courseId,
      amount: price,
      discountAmount,
      coupon: coupon?._id,
      finalAmount,
      status: 'pending',
    });

    // TODO: Integrate with payment gateway (Stripe/PayPal)
    // For now, return payment details
    res.status(200).json({
      success: true,
      data: {
        payment,
        clientSecret: null, // Would be from Stripe
        paymentIntentId: null, // Would be from Stripe
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/:id/confirm
// @access  Private
export const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId, transactionId } = req.body;

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // TODO: Verify payment with gateway
    // For now, mark as completed
    payment.status = 'completed';
    payment.paidAt = new Date();
    payment.transactionId = transactionId || `TXN-${Date.now()}`;
    payment.gatewayPaymentId = paymentIntentId;
    await payment.save();

    // Create invoice
    const invoice = await createInvoice(payment);
    payment.invoice = invoice._id;
    await payment.save();

    // Enroll user in course if course purchase
    if (payment.type === 'course_purchase' && payment.course) {
      const existingEnrollment = await Enrollment.findOne({
        user: payment.user,
        course: payment.course,
      });

      if (!existingEnrollment) {
        await Enrollment.create({
          user: payment.user,
          course: payment.course,
          enrollmentType: 'self',
          status: 'enrolled',
        });

        // Update course enrollment count
        const course = await Course.findById(payment.course);
        course.enrollmentCount = (course.enrollmentCount || 0) + 1;
        await course.save();
      }
    }

    // Update coupon usage
    if (payment.coupon) {
      const coupon = await Coupon.findById(payment.coupon);
      if (coupon) {
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    res.status(200).json({
      success: true,
      data: {
        payment,
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user payments
// @route   GET /api/payments
// @access  Private
export const getPayments = async (req, res, next) => {
  try {
    let query = {};

    // If not admin, only show own payments
    if (req.user.role === 'learner') {
      query.user = req.user._id;
    } else if (req.query.userId) {
      query.user = req.query.userId;
    }

    const payments = await Payment.find(query)
      .populate('user', 'email profile')
      .populate('course', 'title')
      .populate('subscription', 'plan')
      .populate('coupon', 'code discountValue discountType')
      .populate('invoice', 'invoiceNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
export const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'email profile')
      .populate('course', 'title description')
      .populate('subscription', 'plan startDate endDate')
      .populate('coupon', 'code discountValue discountType')
      .populate('invoice');

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Check authorization
    if (
      payment.user._id.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this payment',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create invoice
const createInvoice = async (payment) => {
  const user = await User.findById(payment.user);
  const course = payment.course
    ? await Course.findById(payment.course)
    : null;

  const items = [];
  if (course) {
    items.push({
      name: course.title,
      description: course.description || '',
      quantity: 1,
      unitPrice: payment.amount,
      totalPrice: payment.amount,
    });
  }

  const invoice = await Invoice.create({
    user: payment.user,
    payment: payment._id,
    type: payment.type,
    billingAddress: {
      name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email,
      email: user.email,
    },
    items,
    subtotal: payment.amount,
    discount: payment.discountAmount,
    tax: 0, // Calculate tax if needed
    total: payment.finalAmount,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod || 'card',
    paymentStatus: payment.status === 'completed' ? 'paid' : 'pending',
    paidAt: payment.paidAt,
    status: payment.status === 'completed' ? 'paid' : 'sent',
  });

  return invoice;
};

