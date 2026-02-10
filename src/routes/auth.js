import express from 'express';
import {
  register,
  selfRegister,
  sendVerificationOtp,
  verifyEmailOtp,
  getDevOtp,
  login,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { validateLogin } from '../middleware/validateInput.js';

const router = express.Router();

// Admin-only registration
router.post('/register', authenticate, authorize('super_admin', 'admin'), register);

// Public self-registration
router.post('/self-register', selfRegister);

// Email verification (OTP)
router.post('/send-verification-otp', sendVerificationOtp);
router.post('/verify-email-otp', verifyEmailOtp);
router.get('/dev-otp', getDevOtp);

// Authentication routes
router.post('/login', validateLogin, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resettoken', resetPassword);

export default router;

