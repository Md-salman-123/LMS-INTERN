import Coupon from '../models/Coupon.js';

// @desc    Validate coupon
// @route   POST /api/coupons/validate
// @access  Private
export const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount, courseId, type } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon code not found',
      });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Coupon is invalid or expired',
      });
    }

    // Check applicability
    if (type === 'course' && courseId) {
      if (
        coupon.applicableTo !== 'all' &&
        coupon.applicableTo !== 'courses' &&
        (coupon.applicableTo !== 'specific_courses' ||
          !coupon.courses.some((id) => id.toString() === courseId))
      ) {
        return res.status(400).json({
          success: false,
          error: 'Coupon is not applicable to this course',
        });
      }
    } else if (type === 'subscription') {
      if (coupon.applicableTo !== 'all' && coupon.applicableTo !== 'subscriptions') {
        return res.status(400).json({
          success: false,
          error: 'Coupon is not applicable to subscriptions',
        });
      }
    }

    // Check minimum purchase amount
    if (amount && amount < coupon.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        error: `Minimum purchase amount of ${coupon.minPurchaseAmount} required`,
      });
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(amount || 0);

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          name: coupon.name,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscountAmount: coupon.maxDiscountAmount,
        },
        discount,
        finalAmount: amount ? Math.max(0, amount - discount) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons (admin)
// @route   GET /api/coupons
// @access  Private/Admin
export const getCoupons = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.organization) {
      query.organization = req.user.organization;
    }

    const coupons = await Coupon.find(query)
      .populate('createdBy', 'email profile')
      .populate('courses', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single coupon
// @route   GET /api/coupons/:id
// @access  Private/Admin
export const getCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('createdBy', 'email profile')
      .populate('courses', 'title');

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create coupon
// @route   POST /api/coupons
// @access  Private/Admin
export const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount,
      applicableTo,
      courses,
      validFrom,
      validUntil,
      maxUses,
      maxUsesPerUser,
    } = req.body;

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount: minPurchaseAmount || 0,
      applicableTo: applicableTo || 'all',
      courses: courses || [],
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      maxUses: maxUses || null,
      maxUsesPerUser: maxUsesPerUser || 1,
      createdBy: req.user._id,
      organization: req.user.organization,
    });

    const populatedCoupon = await Coupon.findById(coupon._id)
      .populate('createdBy', 'email profile')
      .populate('courses', 'title');

    res.status(201).json({
      success: true,
      data: populatedCoupon,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code already exists',
      });
    }
    next(error);
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    const {
      name,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount,
      applicableTo,
      courses,
      validFrom,
      validUntil,
      maxUses,
      maxUsesPerUser,
      isActive,
    } = req.body;

    if (name) coupon.name = name;
    if (description !== undefined) coupon.description = description;
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
    if (minPurchaseAmount !== undefined) coupon.minPurchaseAmount = minPurchaseAmount;
    if (applicableTo) coupon.applicableTo = applicableTo;
    if (courses) coupon.courses = courses;
    if (validFrom) coupon.validFrom = new Date(validFrom);
    if (validUntil) coupon.validUntil = new Date(validUntil);
    if (maxUses !== undefined) coupon.maxUses = maxUses;
    if (maxUsesPerUser !== undefined) coupon.maxUsesPerUser = maxUsesPerUser;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    const populatedCoupon = await Coupon.findById(coupon._id)
      .populate('createdBy', 'email profile')
      .populate('courses', 'title');

    res.status(200).json({
      success: true,
      data: populatedCoupon,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};


