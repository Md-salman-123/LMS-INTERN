import express from 'express';
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
} from '../controllers/adminOrganizationsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(authenticate);
router.use(requireSuperAdmin);

router.route('/').get(listOrganizations).post(createOrganization);
router.put('/:id', updateOrganization);

export default router;
