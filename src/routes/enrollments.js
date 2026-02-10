import express from 'express';
import {
  createEnrollment,
  getEnrollments,
  updateEnrollment,
  deleteEnrollment,
  getEnrollmentProgress,
  completeLesson,
  getCourseProgress,
  checkEligibility,
} from '../controllers/enrollmentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.route('/').get(getEnrollments).post(createEnrollment);
router.get('/courses/:id/progress', getCourseProgress);
router.get('/courses/:id/eligibility', checkEligibility);
router.post('/lessons/:id/complete', completeLesson);
router
  .route('/:id')
  .put(authorize('admin', 'super_admin'), updateEnrollment)
  .delete(authorize('admin', 'super_admin'), deleteEnrollment);
router.get('/:id/progress', getEnrollmentProgress);

export default router;

