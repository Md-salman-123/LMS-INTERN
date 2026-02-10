import express from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  getPayments,
  getPayment,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/create-intent', createPaymentIntent);
router.post('/:id/confirm', confirmPayment);
router.get('/', getPayments);
router.get('/:id', getPayment);

export default router;


