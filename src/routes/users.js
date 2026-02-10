import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  getCurrentUser,
  updateCurrentUser,
  updateAvatar,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

// Public routes (require authentication)
router.use(authenticate);

// Current user profile routes (any authenticated user)
router.get('/me', getCurrentUser);
router.put('/me', updateCurrentUser);
router.put('/me/avatar', updateAvatar);

// Admin-only routes
router.use(authorize('super_admin', 'admin'));

router.route('/').get(getUsers);
router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);
router.route('/:id/status').put(updateUserStatus);

export default router;

