import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadPath = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter for course content
const contentFileFilter = (req, file, cb) => {
  // Allow videos, PDFs, PPTs, images, and other document types
  const allowedExtensions = /\.(mp4|webm|ogg|avi|mov|pdf|ppt|pptx|doc|docx|xls|xlsx|txt|jpg|jpeg|png|gif|zip|rar)$/i;
  const allowedMimeTypes = [
    'video/', 'application/pdf', 'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/', 'image/', 'application/zip', 'application/x-rar-compressed'
  ];

  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.some(type => file.mimetype.startsWith(type));

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: videos (mp4, webm, avi), PDFs, PowerPoint (ppt, pptx), documents, images.`));
  }
};

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'));
  }
};

// Configure multer for content files (larger size limit)
export const contentUpload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_CONTENT_FILE_SIZE) || 500 * 1024 * 1024, // 500MB default for videos
  },
  fileFilter: contentFileFilter,
});

// Configure multer for images (smaller size limit)
export const imageUpload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: imageFileFilter,
});

// Default upload (for backward compatibility)
export const upload = imageUpload;

// Middleware for single content file upload
export const uploadContentFile = (fieldName = 'file') => contentUpload.single(fieldName);

// Middleware for multiple content files
export const uploadContentFiles = (fieldName = 'files', maxCount = 10) => contentUpload.array(fieldName, maxCount);

// Middleware for single image upload
export const uploadSingle = (fieldName = 'file') => imageUpload.single(fieldName);

// Middleware for multiple images
export const uploadMultiple = (fieldName = 'files', maxCount = 5) => imageUpload.array(fieldName, maxCount);

