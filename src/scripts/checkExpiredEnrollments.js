// Script to check and expire enrollments based on access duration
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Enrollment from '../models/Enrollment.js';
import logger from '../utils/logger.js';

dotenv.config();

const checkExpiredEnrollments = async () => {
  try {
    await connectDB();

    const now = new Date();
    const expiredEnrollments = await Enrollment.find({
      expiresAt: { $lte: now },
      status: { $ne: 'expired' },
      isActive: true,
    });

    if (expiredEnrollments.length > 0) {
      for (const enrollment of expiredEnrollments) {
        enrollment.status = 'expired';
        enrollment.isActive = false;
        await enrollment.save();
        logger.info(`Expired enrollment: ${enrollment._id} for user ${enrollment.user}`);
      }
      console.log(`Expired ${expiredEnrollments.length} enrollment(s)`);
    } else {
      console.log('No expired enrollments found');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error checking expired enrollments:', error);
    process.exit(1);
  }
};

checkExpiredEnrollments();


