import express from 'express';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/certificateTemplateController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.route('/').get(getTemplates).post(createTemplate);
router.route('/:id').get(getTemplate).put(updateTemplate).delete(deleteTemplate);

export default router;


