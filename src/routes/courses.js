import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  addModule,
  updateModule,
  deleteModule,
  createLesson,
  getLesson,
  updateLesson,
  deleteLesson,
} from '../controllers/courseController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.route('/').get(getCourses).post(authorize('trainer', 'admin', 'super_admin'), createCourse);
router
  .route('/:id')
  .get(getCourse)
  .put(authorize('trainer', 'admin', 'super_admin'), updateCourse)
  .delete(authorize('trainer', 'admin', 'super_admin'), deleteCourse);
router.post('/:id/publish', authorize('trainer', 'admin', 'super_admin'), publishCourse);
router.post('/:id/modules', authorize('trainer', 'admin', 'super_admin'), addModule);
router.put('/:id/modules/:moduleId', authorize('trainer', 'admin', 'super_admin'), updateModule);
router.delete('/:id/modules/:moduleId', authorize('trainer', 'admin', 'super_admin'), deleteModule);

// Lesson routes
router.post('/lessons', authorize('trainer', 'admin', 'super_admin'), createLesson);
router
  .route('/lessons/:id')
  .get(getLesson)
  .put(authorize('trainer', 'admin', 'super_admin'), updateLesson)
  .delete(authorize('trainer', 'admin', 'super_admin'), deleteLesson);

export default router;


