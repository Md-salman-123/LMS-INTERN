import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Also try loading from current working directory
dotenv.config();

/**
 * Check if required environment variables are set
 */
export const checkRequiredEnv = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('========================================');
    console.error('❌ Missing Required Environment Variables');
    console.error('========================================');
    missing.forEach((key) => {
      console.error(`   ✗ ${key}: NOT SET`);
    });
    console.error('========================================');
    console.error('Please ensure these are set in backend/.env file');
    console.error('========================================\n');
    return false;
  }

  return true;
};

/**
 * Validate JWT_SECRET
 */
export const validateJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('❌ JWT_SECRET is not set in .env file');
    console.error('💡 Generate one with: npm run generate:secret');
    return false;
  }

  if (secret.length < 32) {
    console.warn(`⚠️  JWT_SECRET is weak (${secret.length} chars)`);
    console.warn('   Recommended minimum: 32 characters');
    console.warn('💡 Generate a strong one with: npm run generate:secret');
  } else {
    console.log(`✓ JWT_SECRET is set (${secret.length} chars)`);
  }

  return true;
};

// Auto-check on import
checkRequiredEnv();
validateJWTSecret();


