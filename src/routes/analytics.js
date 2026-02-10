import express from 'express';
import {
  getStudentPerformance,
  getCourseEngagement,
  getRevenueReports,
  getInstructorEffectiveness,
} from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.get('/student-performance', authorize('admin', 'super_admin', 'trainer'), getStudentPerformance);
router.get('/course-engagement', authorize('admin', 'super_admin', 'trainer'), getCourseEngagement);
router.get('/revenue', authorize('admin', 'super_admin'), getRevenueReports);
router.get('/instructor-effectiveness', authorize('admin', 'super_admin'), getInstructorEffectiveness);

export default router;


