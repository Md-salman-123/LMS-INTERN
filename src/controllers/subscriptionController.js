import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import Coupon from '../models/Coupon.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

// @desc    Create subscription
// @route   POST /api/subscriptions
// @access  Private
export const createSubscription = async (req, res, next) => {
  try {
    const { plan, couponCode, accessToAllCourses, allowedCourses } = req.body;

    // Define subscription plans
    const plans = {
      monthly: { price: 29.99, duration: 30 }, // 30 days
      yearly: { price: 299.99, duration: 365 }, // 365 days
      lifetime: { price: 999.99, duration: null }, // null = never expires
    };

    if (!plans[plan]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription plan',
      });
    }

    // Check if user already has active subscription
    const existingSubscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active',
    });

    if (existingSubscription && existingSubscription.isActive()) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active subscription',
      });
    }

    let price = plans[plan].price;
    let discountAmount = 0;
    let coupon = null;

    // Apply coupon if provided
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon && coupon.isValid()) {
        if (
          coupon.applicableTo === 'all' ||
          coupon.applicableTo === 'subscriptions'
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

    const finalPrice = Math.max(0, price - discountAmount);

    // Calculate end date
    const startDate = new Date();
    let endDate = null;
    if (plans[plan].duration) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plans[plan].duration);
    } else {
      // Lifetime subscription - set far future date
      endDate = new Date('2099-12-31');
    }

    // Create subscription
    const subscription = await Subscription.create({
      user: req.user._id,
      plan,
      price,
      discountAmount,
      coupon: coupon?._id,
      finalPrice,
      startDate,
      endDate,
      accessToAllCourses: accessToAllCourses !== undefined ? accessToAllCourses : true,
      allowedCourses: allowedCourses || [],
      status: 'active',
    });

    // Create payment record
    const payment = await Payment.create({
      user: req.user._id,
      type: 'subscription',
      subscription: subscription._id,
      amount: price,
      discountAmount,
      coupon: coupon?._id,
      finalAmount: finalPrice,
      status: 'pending',
    });

    subscription.lastPayment = payment._id;
    await subscription.save();

    // Update coupon usage
    if (coupon) {
      coupon.usedCount += 1;
      await coupon.save();
    }

    const populatedSubscription = await Subscription.findById(subscription._id)
      .populate('user', 'email profile')
      .populate('coupon', 'code');

    res.status(201).json({
      success: true,
      data: {
        subscription: populatedSubscription,
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user subscriptions
// @route   GET /api/subscriptions
// @access  Private
export const getSubscriptions = async (req, res, next) => {
  try {
    let query = {};

    // If not admin, only show own subscriptions
    if (req.user.role === 'learner') {
      query.user = req.user._id;
    } else if (req.query.userId) {
      query.user = req.query.userId;
    }

    const subscriptions = await Subscription.find(query)
      .populate('user', 'email profile')
      .populate('coupon', 'code')
      .populate('lastPayment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single subscription
// @route   GET /api/subscriptions/:id
// @access  Private
export const getSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('user', 'email profile')
      .populate('coupon', 'code')
      .populate('lastPayment')
      .populate('allowedCourses', 'title');

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    // Check authorization
    if (
      subscription.user._id.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this subscription',
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel subscription
// @route   POST /api/subscriptions/:id/cancel
// @access  Private
export const cancelSubscription = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    // Check authorization
    if (
      subscription.user.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this subscription',
      });
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || '';

    await subscription.save();

    // TODO: Cancel subscription in payment gateway

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Renew subscription
// @route   POST /api/subscriptions/:id/renew
// @access  Private
export const renewSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    // Check authorization
    if (
      subscription.user.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to renew this subscription',
      });
    }

    // Calculate renewal
    const plans = {
      monthly: { duration: 30 },
      yearly: { duration: 365 },
      lifetime: { duration: null },
    };

    const planConfig = plans[subscription.plan];
    if (!planConfig) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription plan',
      });
    }

    // Extend end date
    if (planConfig.duration) {
      const currentEndDate = new Date(subscription.endDate);
      currentEndDate.setDate(currentEndDate.getDate() + planConfig.duration);
      subscription.endDate = currentEndDate;
    }

    subscription.status = 'active';
    subscription.nextBillingDate = subscription.endDate;

    // Create renewal payment
    const payment = await Payment.create({
      user: subscription.user,
      type: 'renewal',
      subscription: subscription._id,
      amount: subscription.price,
      discountAmount: 0,
      finalAmount: subscription.price,
      status: 'pending',
    });

    subscription.lastPayment = payment._id;
    await subscription.save();

    res.status(200).json({
      success: true,
      data: {
        subscription,
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};


