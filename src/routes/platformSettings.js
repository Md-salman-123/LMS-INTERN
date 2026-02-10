import express from 'express';
import {
  getPlatformSettings,
  updatePlatformSettings,
} from '../controllers/platformSettingsController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.route('/').get(getPlatformSettings).put(updatePlatformSettings);

export default router;


