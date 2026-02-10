import express from 'express';
import {
  getInvoices,
  getInvoice,
  downloadInvoice,
} from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.get('/:id/download', downloadInvoice);

export default router;


