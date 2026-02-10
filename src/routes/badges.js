import express from 'express';
import {
  getBadges,
  getMyBadges,
  awardBadge,
  createBadge,
  checkAndAwardBadges,
} from '../controllers/badgeController.js';
import { authenticate } from '../middleware/auth.js';

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

router.use(authenticate);

router.get('/', getBadges);
router.get('/my-badges', getMyBadges);
router.post('/:badgeId/award', authorize('admin', 'super_admin', 'trainer'), awardBadge);
router.post('/', authorize('admin', 'super_admin'), createBadge);
router.post('/check-and-award', checkAndAwardBadges);

export default router;


