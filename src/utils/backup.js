// Database backup utility
// For production, use MongoDB's native backup tools or mongodump

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export const backupDatabase = async (backupPath = './backups') => {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupPath, `lms-backup-${timestamp}.gz`);

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not configured');
    }

    // Use mongodump to create backup
    const command = `mongodump --uri="${mongoUri}" --archive=${backupFile} --gzip`;

    await execAsync(command);

    console.log(`Backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
};

// Note: This requires mongodump to be installed on the system
// For production, use scheduled backups via cron or MongoDB Atlas automated backups


