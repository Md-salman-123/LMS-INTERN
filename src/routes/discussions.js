import express from 'express';
import {
  getCourseDiscussions,
  getDiscussion,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  toggleUpvote,
} from '../controllers/discussionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/course/:courseId', getCourseDiscussions);
router.post('/:id/upvote', toggleUpvote);
router.route('/:id').get(getDiscussion).put(updateDiscussion).delete(deleteDiscussion);
router.route('/').post(createDiscussion);

export default router;


