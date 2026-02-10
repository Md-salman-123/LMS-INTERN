import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');

console.log('========================================');
console.log('Quick Setup - Fixing JWT_SECRET & MongoDB');
console.log('========================================\n');

// Step 1: Check/create .env file
let envExists = fs.existsSync(envPath);
let envContent = '';

if (envExists) {
  console.log('✓ .env file found');
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  console.log('⚠ .env file not found - will create one');
}

// Step 2: Check JWT_SECRET
dotenv.config({ path: envPath });
const currentJwtSecret = process.env.JWT_SECRET;

if (!currentJwtSecret || currentJwtSecret.length < 32) {
  console.log('\n⚠ JWT_SECRET is missing or too weak');
  const newSecret = crypto.randomBytes(64).toString('hex');
  
  if (envExists) {
    // Update existing .env
    if (currentJwtSecret) {
      envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${newSecret}`);
    } else {
      envContent += `\nJWT_SECRET=${newSecret}\n`;
    }
  } else {
    // Create new .env
    envContent = `# Server Configuration
NODE_ENV=development
PORT=5001

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/lms

# JWT Configuration
JWT_SECRET=${newSecret}
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:5173
`;
  }
  
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ JWT_SECRET generated and added to .env');
  console.log(`   Secret: ${newSecret.substring(0, 20)}... (${newSecret.length} chars)`);
} else {
  console.log(`✓ JWT_SECRET is set (${currentJwtSecret.length} chars)`);
}

// Step 3: Check MONGODB_URI
dotenv.config({ path: envPath });
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.log('\n⚠ MONGODB_URI is missing');
  const defaultUri = 'mongodb://localhost:27017/lms';
  
  if (envExists) {
    envContent += `\nMONGODB_URI=${defaultUri}\n`;
  } else {
    // Already added in new .env creation above
  }
  
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ MONGODB_URI added to .env');
  console.log(`   URI: ${defaultUri}`);
  console.log('   ⚠ Make sure MongoDB is running on localhost:27017');
} else {
  console.log(`✓ MONGODB_URI is set`);
  console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
}

// Step 4: Test MongoDB connection
console.log('\n========================================');
console.log('Testing MongoDB Connection...');
console.log('========================================');

dotenv.config({ path: envPath });
const testUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

try {
  await mongoose.connect(testUri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ MongoDB connection successful!');
  await mongoose.disconnect();
} catch (error) {
  console.log('❌ MongoDB connection failed!');
  console.log(`   Error: ${error.message}`);
  console.log('\n💡 Solutions:');
  console.log('   1. Make sure MongoDB is running');
  console.log('   2. Check MONGODB_URI in .env file');
  console.log('   3. For local: mongodb://localhost:27017/lms');
  console.log('   4. For Atlas: mongodb+srv://user:pass@cluster.mongodb.net/lms');
}

console.log('\n========================================');
console.log('Setup Complete!');
console.log('========================================');
console.log('\nNext steps:');
console.log('1. Review .env file: backend/.env');
console.log('2. Update MONGODB_URI if needed');
console.log('3. Restart backend server: npm start');
console.log('========================================\n');

process.exit(0);

