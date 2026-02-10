// Test script to verify backend configuration
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file (same way as server.js)
// Try from backend directory first
const envPath = join(__dirname, '.env');
dotenv.config({ path: envPath });
// Also try from current working directory (fallback)
dotenv.config();

console.log('========================================');
console.log('Backend Configuration Test');
console.log('========================================\n');

// Check JWT_SECRET
console.log('1. JWT_SECRET:');
if (process.env.JWT_SECRET) {
  const length = process.env.JWT_SECRET.length;
  if (length >= 32) {
    console.log(`   ✅ SET (${length} chars) - Strong`);
  } else {
    console.log(`   ⚠️  SET (${length} chars) - Weak (minimum 32 recommended)`);
  }
} else {
  console.log('   ❌ NOT SET');
}

// Check MONGODB_URI
console.log('\n2. MONGODB_URI:');
if (process.env.MONGODB_URI) {
  console.log('   ✅ SET');
  console.log(`   URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
  
  // Test connection
  console.log('\n3. MongoDB Connection Test:');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('   ✅ SUCCESS - MongoDB is connected');
    await mongoose.disconnect();
  } catch (error) {
    console.log('   ❌ FAILED - MongoDB connection error');
    console.log(`   Error: ${error.message}`);
    console.log('\n   💡 Solutions:');
    console.log('   - Make sure MongoDB is running');
    console.log('   - Check if MongoDB is on localhost:27017');
    console.log('   - If using Docker: docker-compose up -d mongodb');
    console.log('   - If using MongoDB Atlas, verify your connection string');
  }
} else {
  console.log('   ❌ NOT SET');
}

// Check other important variables
console.log('\n4. Other Configuration:');
console.log(`   PORT: ${process.env.PORT || '5001 (default)'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:5173 (default)'}`);

console.log('\n========================================');
console.log('Configuration Test Complete');
console.log('========================================\n');

process.exit(0);

