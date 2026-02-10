import express from 'express';
import {
  getCodingLabs,
  getCodingLab,
  createCodingLab,
  submitCode,
  getSubmissions,
  updateCodingLab,
  deleteCodingLab,
} from '../controllers/codingLabController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

// Helper function to check roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized',
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }
    next();
  };
};

// Public routes (no auth required for viewing, but optional auth to get user-specific data)
router.get('/', getCodingLabs);
router.get('/:id', optionalAuthenticate, getCodingLab);

// Protected routes (auth required for actions)
router.use(authenticate);
router.post('/', authorize('trainer', 'admin', 'super_admin'), createCodingLab);
router.post('/:id/submit', submitCode);
router.get('/:id/submissions', getSubmissions);
router.put('/:id', authorize('trainer', 'admin', 'super_admin'), updateCodingLab);
router.delete('/:id', authorize('trainer', 'admin', 'super_admin'), deleteCodingLab);

export default router;

