import express from 'express';
import { getGlobalSettings, updateGlobalSettings } from '../controllers/globalSettingsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(authenticate);
router.use(requireSuperAdmin);

router.route('/').get(getGlobalSettings).put(updateGlobalSettings);

export default router;
