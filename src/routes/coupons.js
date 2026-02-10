import express from 'express';
import {
  validateCoupon,
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.post('/validate', authenticate, validateCoupon);

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.route('/').get(getCoupons).post(createCoupon);
router.route('/:id').get(getCoupon).put(updateCoupon).delete(deleteCoupon);

export default router;


