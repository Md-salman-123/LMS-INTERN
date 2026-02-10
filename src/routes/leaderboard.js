import express from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getLeaderboard);

export default router;


