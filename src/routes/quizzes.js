import express from 'express';
import {
  createQuiz,
  getCourseQuizzes,
  getMyQuizAttempts,
  getQuiz,
  startQuizAttempt,
  submitQuizAttempt,
  gradeQuizAttempt,
  getQuizAttempts,
  getQuizResults,
} from '../controllers/quizController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .post(authorize('trainer', 'admin', 'super_admin'), createQuiz);
router.get('/course/:courseId', getCourseQuizzes);
router.get('/my-attempts', getMyQuizAttempts);
router.get('/:id', getQuiz);
router.post('/:id/start', startQuizAttempt);
router.post('/:id/attempt', submitQuizAttempt);
router.put('/:id/attempts/:attemptId/grade', authorize('trainer', 'admin', 'super_admin'), gradeQuizAttempt);
router.get('/:id/attempts', getQuizAttempts);
router.get('/:id/results/:attemptId', getQuizResults);

export default router;

