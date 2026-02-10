import express from 'express';
import {
  getDiscussionThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
} from '../controllers/threadController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/discussion/:discussionId', getDiscussionThreads);
router.route('/:id').get(getThread).put(updateThread).delete(deleteThread);
router.route('/').post(createThread);

export default router;


