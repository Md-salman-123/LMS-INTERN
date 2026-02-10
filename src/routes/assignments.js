import express from 'express';
import {
  createAssignment,
  getCourseAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  runAssignmentTests,
  gradeAssignment,
  getAssignmentSubmissions,
  getMySubmission,
} from '../controllers/assignmentController.js';
import { runCode } from '../controllers/runCodeController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .post(authorize('trainer', 'admin', 'super_admin'), createAssignment);
router.post('/run-code', runCode);
router.get('/course/:courseId', getCourseAssignments);
router
  .route('/:id')
  .get(getAssignment)
  .put(authorize('trainer', 'admin', 'super_admin'), updateAssignment)
  .delete(authorize('trainer', 'admin', 'super_admin'), deleteAssignment);
router.post('/:id/submit', submitAssignment);
router.post('/:id/run-tests', runAssignmentTests);
router.get('/:id/submissions', getAssignmentSubmissions);
router.get('/:id/my-submission', getMySubmission);
router.put(
  '/:id/submissions/:submissionId/grade',
  authorize('trainer', 'admin', 'super_admin'),
  gradeAssignment
);

export default router;


