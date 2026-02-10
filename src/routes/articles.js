import express from 'express';
import {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticleVersions,
  getCategories,
  createCategory,
} from '../controllers/articleController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(authenticate);

router.route('/').get(getArticles).post(authorize('trainer', 'admin', 'super_admin'), createArticle);
router.route('/:id').get(getArticle).put(authorize('trainer', 'admin', 'super_admin'), updateArticle).delete(authorize('trainer', 'admin', 'super_admin'), deleteArticle);
router.get('/:id/versions', getArticleVersions);

// Categories
router.route('/categories').get(getCategories).post(authorize('admin', 'super_admin'), createCategory);

export default router;


