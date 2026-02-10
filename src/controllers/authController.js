import User from '../models/User.js';
import { generateToken } from '../config/jwt.js';
import { updateUserStreak } from '../utils/streak.js';
import crypto from 'crypto';
import { sendEmail } from '../services/emailService.js';
import { emailTemplates } from '../utils/emailTemplates.js';

const OTP_EXPIRY_MINUTES = 10;

// Dev only: in-memory store so the app can show OTP when email fails (no need to check terminal)
const devOtpStore = new Map(); // email -> { otp, expiresAt }

// Generate 6-digit OTP, save to user, and send email. Email is sent in background so signup stays fast.
async function generateAndSendVerificationOtp(user, options = {}) {
  const { waitForEmail = false } = options; // set true only when we need to know if email was sent (e.g. resend)
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  user.emailVerificationOtp = hashedOtp;
  user.emailVerificationOtpExpire = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  if (process.env.NODE_ENV !== 'production') {
    devOtpStore.set(user.email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    });
  }

  const userName = user.profile?.firstName || user.email?.split('@')[0] || 'User';
  const { subject, html } = emailTemplates.verificationOtp(otp, userName);
  const doSend = () =>
    sendEmail({
      email: user.email,
      subject,
      html,
      message: `Your OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    }).then((sent) => {
      if (!sent && process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Email could not be sent. Verification OTP for ${user.email}: ${otp}`);
      }
      return sent;
    });

  if (waitForEmail) {
    const sent = await doSend();
    return { sent, otp };
  }
  doSend().catch((err) => console.error('Verification email send error:', err));
  return { sent: null, otp }; // null = unknown (sent in background)
}

// @desc    Register user (Admin only). Super Admin: can create Admins, Trainers, Students. Admin: Trainers, Students only.
// @route   POST /api/auth/register
// @access  Private/Admin
export const register = async (req, res, next) => {
  try {
    const { email, password, role, profile, organization } = req.body;
    const isSuperAdmin = req.user?.role === 'super_admin';

    // Only Super Admin can create Admins
    if (role === 'admin' && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only Super Admin can create Admin users',
      });
    }
    if (role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Super Admin users cannot be created via registration',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Normalize role (map student/instructor to learner/trainer)
    let normalizedRole = role;
    if (role === 'student') normalizedRole = 'learner';
    if (role === 'instructor') normalizedRole = 'trainer';

    // Admin can only create users in their organization; Super Admin can assign org
    const userOrg = req.user.role === 'super_admin' ? (organization || req.user.organization) : req.user.organization;

    const user = await User.create({
      email,
      password,
      role: normalizedRole || 'learner',
      profile,
      organization: userOrg,
      emailVerified: true, // Admin-created users are trusted
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          displayRole: user.displayRole,
          status: user.status,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Self-register user (Public)
// @route   POST /api/auth/self-register
// @access  Public
export const selfRegister = async (req, res, next) => {
  try {
    const { email, password, role, profile } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Only allow student/instructor self-registration
    let normalizedRole = 'learner'; // Default to student
    if (role === 'instructor') {
      normalizedRole = 'trainer';
    } else if (role === 'student' || !role) {
      normalizedRole = 'learner';
    } else {
      // Only admin can create admin users
      normalizedRole = 'learner';
    }

    // Get default organization (first one or create)
    const Organization = (await import('../models/Organization.js')).default;
    let defaultOrg = await Organization.findOne();
    if (!defaultOrg) {
      defaultOrg = await Organization.create({
        name: 'Default Organization',
        logo: '',
        theme: {
          primaryColor: '#4F46E5',
          secondaryColor: '#6366F1',
        },
      });
    }

    // Create user (no email verification required)
    const user = await User.create({
      email,
      password,
      role: normalizedRole,
      profile,
      organization: defaultOrg._id,
      status: 'active',
      emailVerified: true,
    });

    const token = generateToken(user._id);
    const userPayload = {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: String(user.email),
      role: String(user.role),
      displayRole: String(user.displayRole || user.role),
      status: String(user.status),
      profile: user.profile && typeof user.profile === 'object' ? { ...user.profile } : {},
      organization: user.organization ? user.organization.toString() : null,
    };
    res.status(201).json({
      success: true,
      message: 'Account created.',
      data: {
        token: String(token),
        user: userPayload,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send verification OTP (e.g. resend after signup)
// @route   POST /api/auth/send-verification-otp
// @access  Public
export const sendVerificationOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Please provide email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email' });
    }
    if (user.emailVerified) {
      return res.status(400).json({ success: false, error: 'Email is already verified' });
    }

    const { sent, otp } = await generateAndSendVerificationOtp(user, { waitForEmail: true });
    const data = { email: user.email };
    if (!sent) {
      const errMsg =
        'OTP could not be sent. Configure email in backend/.env (EMAIL_HOST, EMAIL_USER, EMAIL_PASS).';
      if (process.env.NODE_ENV !== 'production' && otp) {
        return res.status(200).json({
          success: true,
          message: 'Email not configured. Use the code below to verify.',
          data: { ...data, devOtp: otp },
        });
      }
      return res.status(503).json({
        success: false,
        error: errMsg,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with OTP (completes signup, returns token)
// @route   POST /api/auth/verify-email-otp
// @access  Public
export const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Please provide email and OTP' });
    }

    const user = await User.findOne({ email }).select('+emailVerificationOtp');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or OTP' });
    }
    if (user.emailVerified) {
      const token = generateToken(user._id);
      const userObj = user.toObject ? user.toObject() : user;
      delete userObj.emailVerificationOtp;
      delete userObj.password;
      return res.status(200).json({
        success: true,
        message: 'Email already verified',
        data: { token, user: { id: user._id, email: user.email, role: user.role, displayRole: user.displayRole, status: user.status, profile: user.profile, organization: user.organization, emailVerified: true } },
      });
    }

    if (!user.emailVerificationOtp || !user.emailVerificationOtpExpire) {
      return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
    }
    if (user.emailVerificationOtpExpire < new Date()) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    const hashedOtp = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    if (user.emailVerificationOtp !== hashedOtp) {
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }

    user.emailVerified = true;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpire = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    const userData = {
      id: user._id,
      email: user.email,
      role: user.role,
      displayRole: user.displayRole,
      status: user.status,
      profile: user.profile,
      organization: user.organization,
      emailVerified: true,
    };

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: { token, user: userData },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get OTP for dev when email send fails (development only)
// @route   GET /api/auth/dev-otp?email=...
// @access  Public, only when NODE_ENV !== 'production'
export const getDevOtp = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  const email = (req.query.email || '').toString().toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email required' });
  }
  const entry = devOtpStore.get(email);
  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(404).json({ success: false, error: 'No OTP found or expired' });
  }
  res.status(200).json({ success: true, data: { otp: entry.otp } });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is inactive',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Mark email as verified on login if it was never set (legacy accounts from when OTP was required)
    if (user.emailVerified === false) {
      user.emailVerified = true;
      await user.save({ validateBeforeSave: false });
    }

    // Generate token
    let token;
    try {
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is missing from environment variables');
        console.error('Please ensure JWT_SECRET is set in backend/.env file');
        console.error('You can generate one with: npm run generate:secret');
        throw new Error('JWT_SECRET is not configured');
      }
      token = generateToken(user._id);
    } catch (error) {
      console.error('Token generation error:', error.message);
      console.error('Full error:', error);
      return res.status(500).json({
        success: false,
        error: `Failed to generate authentication token: ${error.message}. Please check server configuration (JWT_SECRET in .env file).`,
      });
    }

    // Update learning streak on login (counts as daily activity)
    try {
      await updateUserStreak(user._id);
    } catch (err) {
      console.error('Streak update on login:', err);
    }

    // Reload user so response includes updated streak (and points/level if changed elsewhere)
    const freshUser = await User.findById(user._id).select('points level streak').lean();
    const streak = freshUser?.streak?.current != null
      ? { current: freshUser.streak.current, longest: freshUser.streak.longest || 0 }
      : { current: 0, longest: 0 };

    // Populate organization if it exists (safely)
    if (user.organization) {
      try {
        await user.populate('organization', 'name logo');
      } catch (error) {
        // If populate fails, continue without organization data
        console.error('Error populating organization:', error);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          id: user._id,
          email: user.email,
          role: user.role,
          status: user.status,
          profile: user.profile || {},
          organization: user.organization || null,
          points: freshUser?.points ?? user.points ?? 0,
          level: freshUser?.level ?? user.level ?? 1,
          streak,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If email exists, password reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        message: `You requested a password reset. Please click the link to reset your password: ${resetUrl}`,
      });

      res.status(200).json({
        success: true,
        message: 'Password reset email sent',
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'Email could not be sent',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

