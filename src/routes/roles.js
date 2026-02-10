import express from 'express';
import { getRoles } from '../controllers/rolesController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/', getRoles);

export default router;
