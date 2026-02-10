import express from 'express';
import {
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchEnrollments,
} from '../controllers/batchController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.route('/').get(getBatches).post(authorize('trainer', 'instructor', 'admin', 'super_admin'), createBatch);
router
  .route('/:id')
  .get(getBatch)
  .put(authorize('trainer', 'instructor', 'admin', 'super_admin'), updateBatch)
  .delete(authorize('trainer', 'instructor', 'admin', 'super_admin'), deleteBatch);
router.get('/:id/enrollments', getBatchEnrollments);

export default router;


