import express from 'express';
import {
  uploadFile,
  getLessonVersions,
  restoreLessonVersion,
  getAvailableLessons,
  deleteFile,
} from '../controllers/contentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { uploadContentFile } from '../middleware/fileUpload.js';

const router = express.Router();

router.use(authenticate);

// File upload
router.post('/upload', authorize('trainer', 'instructor', 'admin', 'super_admin'), uploadContentFile('file'), uploadFile);

// File deletion
router.delete('/files/:filename', authorize('trainer', 'instructor', 'admin', 'super_admin'), deleteFile);

// Version control
router.get('/lessons/:id/versions', getLessonVersions);
router.post('/lessons/:id/versions/:versionId/restore', authorize('trainer', 'instructor', 'admin', 'super_admin'), restoreLessonVersion);

// Drip learning
router.get('/lessons/available/:courseId', getAvailableLessons);

export default router;


