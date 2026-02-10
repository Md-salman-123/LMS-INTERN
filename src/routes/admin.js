import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getPendingCourses,
  approveCourse,
  rejectCourse,
  getPlatformStatistics,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/statistics', getPlatformStatistics);
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/courses/pending', getPendingCourses);
router.post('/courses/:id/approve', approveCourse);
router.post('/courses/:id/reject', rejectCourse);

export default router;


