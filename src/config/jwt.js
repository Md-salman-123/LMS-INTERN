import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure .env is loaded (in case this module loaded before loadEnv.js)
function ensureEnv() {
  if (process.env.JWT_SECRET) return;
  const paths = [
    resolve(__dirname, '../../.env'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'backend/.env'),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      dotenv.config({ path: p });
      if (process.env.JWT_SECRET) return;
    }
  }
  dotenv.config();
}
ensureEnv();

export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('JWT_SECRET is not configured in environment variables');
    console.error('Please ensure JWT_SECRET is set in your .env file');
    console.error('You can generate one with: npm run generate:secret');
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  
  if (secret.length < 32) {
    console.warn(`⚠️  JWT_SECRET is weak (${secret.length} chars). Minimum recommended: 32 characters`);
  }
  
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('JWT_SECRET is not configured in environment variables');
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  
  return jwt.verify(token, secret);
};

