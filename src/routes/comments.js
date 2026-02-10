import express from 'express';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  toggleUpvote,
  resolveComment,
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getComments);
router.post('/:id/upvote', toggleUpvote);
router.post('/:id/resolve', resolveComment);
router.route('/:id').put(updateComment).delete(deleteComment);
router.route('/').post(createComment);

export default router;


