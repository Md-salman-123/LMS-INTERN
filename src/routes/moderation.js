import express from 'express';
import {
  reportContent,
  getModerationReports,
  reviewModerationReport,
} from '../controllers/moderationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.post('/report', authenticate, reportContent);
router.get('/reports', authenticate, authorize('admin', 'super_admin'), getModerationReports);
router.post('/reports/:id/review', authenticate, authorize('admin', 'super_admin'), reviewModerationReport);

export default router;


