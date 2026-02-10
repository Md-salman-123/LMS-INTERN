import express from 'express';
import {
  trackLessonView,
  getCourseProgress,
  getProgressOverview,
  getPerformanceAnalytics,
  updateLessonProgress,
} from '../controllers/progressController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/lessons/:id/track', trackLessonView);
router.put('/lessons/:id', updateLessonProgress);
router.get('/courses/:courseId', getCourseProgress);
router.get('/overview', getProgressOverview);
router.get('/performance', getPerformanceAnalytics);

export default router;


