// Load .env first so JWT_SECRET etc. are set before any other modules (auth, jwt) load
import './loadEnv.js';

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/database.js';
import errorHandler from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { securityHeaders } from './middleware/helmet.js';
import logger from './utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure .env is loaded (loadEnv.js runs first; this is fallback)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });
dotenv.config();

// Verify critical environment variables (exit if missing)
if (!process.env.JWT_SECRET) {
  console.error('========================================');
  console.error('❌ CRITICAL: JWT_SECRET is not set!');
  console.error('========================================');
  console.error('Set JWT_SECRET in backend/.env. Generate: npm run generate:secret');
  console.error('========================================\n');
  process.exit(1);
}
const hasMongoUri = process.env.MONGODB_URI ||
  (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD && process.env.MONGODB_HOST);
if (!hasMongoUri) {
  console.error('========================================');
  console.error('❌ CRITICAL: MongoDB not configured!');
  console.error('========================================');
  console.error('Set MONGODB_URI in backend/.env, or MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST');
  console.error('========================================\n');
  process.exit(1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

const app = express();

// Request logging (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(requestLogger);
}

// Security: Rate limiting (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', rateLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  ));
}

// Middleware
import { sanitizeBody } from './middleware/validateInput.js';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeBody); // Sanitize all inputs
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Security headers
app.use(securityHeaders);

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import organizationRoutes from './routes/organization.js';
import courseRoutes from './routes/courses.js';
import categoryRoutes from './routes/categories.js';
import contentRoutes from './routes/content.js';
import batchRoutes from './routes/batches.js';
import articleRoutes from './routes/articles.js';
import enrollmentRoutes from './routes/enrollments.js';
import quizRoutes from './routes/quizzes.js';
import assignmentRoutes from './routes/assignments.js';
import certificateRoutes from './routes/certificates.js';
import certificateTemplateRoutes from './routes/certificateTemplates.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import progressRoutes from './routes/progress.js';
import discussionRoutes from './routes/discussions.js';
import announcementRoutes from './routes/announcements.js';
import commentRoutes from './routes/comments.js';
import threadRoutes from './routes/threads.js';
import liveClassRoutes from './routes/liveClasses.js';
import recordingRoutes from './routes/recordings.js';
import paymentRoutes from './routes/payments.js';
import subscriptionRoutes from './routes/subscriptions.js';
import couponRoutes from './routes/coupons.js';
import invoiceRoutes from './routes/invoices.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import moderationRoutes from './routes/moderation.js';
import platformSettingsRoutes from './routes/platformSettings.js';
import globalSettingsRoutes from './routes/globalSettings.js';
import auditLogsRoutes from './routes/auditLogs.js';
import adminOrganizationsRoutes from './routes/adminOrganizations.js';
import rolesRoutes from './routes/roles.js';
import learningPathRoutes from './routes/learningPaths.js';
import codingLabRoutes from './routes/codingLabs.js';
import badgeRoutes from './routes/badges.js';
import leaderboardRoutes from './routes/leaderboard.js';

import { checkHealth } from './utils/healthCheck.js';

app.get('/api/health', async (req, res) => {
  const health = await checkHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: health.status === 'healthy',
    message: 'LMS API Health Check',
    data: health,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/certificate-templates', certificateTemplateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/live-classes', liveClassRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin/settings', platformSettingsRoutes);
app.use('/api/admin/global-settings', globalSettingsRoutes);
app.use('/api/admin/audit-logs', auditLogsRoutes);
app.use('/api/admin/organizations', adminOrganizationsRoutes);
app.use('/api/admin/roles', rolesRoutes);
app.use('/api/learning-paths', learningPathRoutes);
app.use('/api/coding-labs', codingLabRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      if (process.env.NODE_ENV === 'production') {
        logger.info('Production mode enabled - security features active');
      }
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    console.error('Ensure MongoDB is running and MONGODB_URI is correct in backend/.env');
    console.error('If using Atlas: add your IP to Network Access (whitelist). See MONGODB_SETUP_NO_DOCKER.md');
    process.exit(1);
  }
};

start();

