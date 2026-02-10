import express from 'express';
import {
  getCourseLiveClasses,
  getLiveClass,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
  joinLiveClass,
  leaveLiveClass,
  getAttendance,
  markAttendance,
} from '../controllers/liveClassController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.get('/course/:courseId', getCourseLiveClasses);
router.post('/:id/join', joinLiveClass);
router.post('/:id/leave', leaveLiveClass);
router.get('/:id/attendance', authorize('trainer', 'admin', 'super_admin'), getAttendance);
router.post('/:id/attendance', authorize('trainer', 'admin', 'super_admin'), markAttendance);
router
  .route('/:id')
  .get(getLiveClass)
  .put(authorize('trainer', 'admin', 'super_admin'), updateLiveClass)
  .delete(authorize('trainer', 'admin', 'super_admin'), deleteLiveClass);
router.route('/').post(authorize('trainer', 'admin', 'super_admin'), createLiveClass);

export default router;


