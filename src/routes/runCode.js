import express from 'express';
import { runCode } from '../controllers/runCodeController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, runCode);

export default router;
