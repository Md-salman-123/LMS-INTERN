import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const MONGODB_FIX_HINT = `
  MongoDB connection failed. Check:
  1. "timed out" / "MongoNetworkTimeoutError" → Network or Atlas blocking. Try:
     - Atlas: Network Access → Add IP → Allow from Anywhere (0.0.0.0/0) → wait 2 min.
     - Try another network (e.g. mobile hotspot) if your Wi‑Fi blocks MongoDB.
  2. Cluster paused? Database → your cluster → click "Resume" (free tier pauses after inactivity).
  3. Database Access → user exists; reset password; set MONGODB_URI in backend/.env.
  4. Fresh URI: Database → Connect → Connect your application → copy into MONGODB_URI.
  See MONGODB_SETUP_NO_DOCKER.md for details.
`;

/**
 * Get MongoDB URI: use MONGODB_URI, or build from MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST (password is URL-encoded).
 */
function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST;
  const db = process.env.MONGODB_DB || 'lms';
  if (user && password && host) {
    const encoded = encodeURIComponent(password);
    return `mongodb+srv://${user}:${encoded}@${host}/${db}?retryWrites=true&w=majority`;
  }
  return null;
}

const connectDB = async () => {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error('Set MONGODB_URI (or MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST) in backend/.env');
  }

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000, // 60s – avoid "connection timed out" on slow/unstable networks
    connectTimeoutMS: 30000,
  };

  const isDev = process.env.NODE_ENV !== 'production';
  const maxAttempts = isDev ? 3 : 1;
  const retryDelayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const conn = await mongoose.connect(uri, options);

      if (process.env.NODE_ENV === 'production') {
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
      } else {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
      }

      if (process.env.CREATE_INDEXES_ON_START === 'true') {
        const { createIndexes } = await import('../utils/dbIndexes.js');
        await createIndexes();
      }
      return;
    } catch (error) {
      logger.error(`MongoDB connection error: ${error.message}`);
      if (attempt < maxAttempts && isDev) {
        console.warn(`Retry ${attempt}/${maxAttempts} in ${retryDelayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      console.error(MONGODB_FIX_HINT);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      throw error;
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error:', err);
});

export default connectDB;

