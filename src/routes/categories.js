import express from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.route('/').get(getCategories).post(authorize('admin', 'super_admin'), createCategory);
router
  .route('/:id')
  .get(getCategory)
  .put(authorize('admin', 'super_admin'), updateCategory)
  .delete(authorize('admin', 'super_admin'), deleteCategory);

export default router;


