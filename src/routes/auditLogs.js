import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/', getAuditLogs);

export default router;
