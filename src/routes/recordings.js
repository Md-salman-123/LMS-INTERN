import express from 'express';
import {
  getLiveClassRecordings,
  getRecording,
  createRecording,
  updateRecording,
  deleteRecording,
} from '../controllers/recordingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.get('/live-class/:liveClassId', getLiveClassRecordings);
router
  .route('/:id')
  .get(getRecording)
  .put(authorize('trainer', 'admin', 'super_admin'), updateRecording)
  .delete(authorize('trainer', 'admin', 'super_admin'), deleteRecording);
router.route('/').post(authorize('trainer', 'admin', 'super_admin'), createRecording);

export default router;


