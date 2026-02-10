import express from 'express';
import {
  getCourseAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/course/:courseId', getCourseAnnouncements);
router
  .route('/:id')
  .get(getAnnouncement)
  .put(updateAnnouncement)
  .delete(deleteAnnouncement);
router.route('/').post(createAnnouncement);

export default router;


