import express from 'express';
import {
  getOrganization,
  updateOrganization,
  uploadLogo,
  updateTheme,
} from '../controllers/organizationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.route('/').get(getOrganization).put(authorize('super_admin', 'admin'), updateOrganization);
router.post('/logo', authorize('super_admin', 'admin'), uploadLogo);
router.put('/theme', authorize('super_admin', 'admin'), updateTheme);

export default router;


