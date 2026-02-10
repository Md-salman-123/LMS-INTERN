import express from 'express';
import {
  getLearningPaths,
  getLearningPath,
  createLearningPath,
  generateLearningPath,
  enrollInLearningPath,
  getLearningPathProgress,
  updateLearningPath,
  deleteLearningPath,
} from '../controllers/learningPathController.js';
import { authenticate as protect, optionalAuthenticate } from '../middleware/auth.js';

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

// Optional auth so logged-in admins/trainers see draft paths; public sees only published
router.get('/', optionalAuthenticate, getLearningPaths);
router.get('/:id', optionalAuthenticate, getLearningPath);
router.post('/generate', protect, authorize('trainer', 'instructor', 'admin', 'super_admin'), generateLearningPath);
router.post('/', protect, authorize('trainer', 'instructor', 'admin', 'super_admin'), createLearningPath);
router.post('/:id/enroll', protect, enrollInLearningPath);
router.get('/:id/progress', protect, getLearningPathProgress);
router.put('/:id', protect, authorize('trainer', 'instructor', 'admin', 'super_admin'), updateLearningPath);
router.delete('/:id', protect, authorize('trainer', 'instructor', 'admin', 'super_admin'), deleteLearningPath);

export default router;

