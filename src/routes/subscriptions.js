import express from 'express';
import {
  createSubscription,
  getSubscriptions,
  getSubscription,
  cancelSubscription,
  renewSubscription,
} from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/:id/cancel', cancelSubscription);
router.post('/:id/renew', renewSubscription);
router.get('/', getSubscriptions);
router.get('/:id', getSubscription);
router.post('/', createSubscription);

export default router;


