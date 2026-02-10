import express from 'express';
import {
  getOverview,
  getCourseAnalytics,
  getUserMetrics,
  exportReports,
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin', 'trainer'));

router.get('/overview', authorize('admin', 'super_admin'), getOverview);
router.get('/courses', getCourseAnalytics);
router.get('/users', authorize('admin', 'super_admin'), getUserMetrics);
router.get('/export', authorize('admin', 'super_admin'), exportReports);

export default router;


