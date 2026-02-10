import express from 'express';
import {
  createCertificate,
  getCertificates,
  downloadCertificate,
  verifyCertificate,
  getCertificateByShareToken,
  toggleCertificateSharing,
} from '../controllers/certificateController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/verify/:verificationId', verifyCertificate);
router.get('/share/:shareToken', getCertificateByShareToken);

// Protected routes
router.use(authenticate);
router.post('/generate', createCertificate);
router.get('/', getCertificates);
router.get('/:id/download', downloadCertificate);
router.put('/:id/share', toggleCertificateSharing);

export default router;
