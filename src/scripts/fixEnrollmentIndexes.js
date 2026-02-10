// Script to fix enrollment collection indexes
// This removes old indexes and ensures correct indexes are in place
// Run with: node src/scripts/fixEnrollmentIndexes.js

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });
dotenv.config();

const fixEnrollmentIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const enrollmentsCollection = db.collection('enrollments');

    // Get current indexes
    console.log('\n📋 Current indexes:');
    const indexes = await enrollmentsCollection.indexes();
    indexes.forEach((index) => {
      console.log(`   ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop old/problematic indexes
    const indexesToDrop = ['learnerId_1_courseId_1', 'user_1_courseId_1', 'learnerId_1_course_1'];
    
    console.log('\n🗑️  Dropping old indexes...');
    for (const indexName of indexesToDrop) {
      try {
        await enrollmentsCollection.dropIndex(indexName);
        console.log(`   ✅ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.code === 27) {
          // Index doesn't exist, that's fine
          console.log(`   ℹ️  Index ${indexName} doesn't exist (skipping)`);
        } else {
          console.log(`   ⚠️  Could not drop ${indexName}: ${error.message}`);
        }
      }
    }

    // Clean up any enrollments with null user or course
    console.log('\n🧹 Cleaning up invalid enrollments...');
    const deleteResult = await enrollmentsCollection.deleteMany({
      $or: [
        { user: null },
        { course: null },
        { user: { $exists: false } },
        { course: { $exists: false } },
      ],
    });
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} invalid enrollments`);

    // Recreate correct indexes (Mongoose will handle this, but we can verify)
    console.log('\n✅ Index cleanup complete!');
    console.log('   The correct indexes will be created automatically by Mongoose on next server start.');
    console.log('   Expected indexes:');
    console.log('   - { user: 1, course: 1, batch: 1 } (unique, sparse)');
    console.log('   - { user: 1, course: 1 }');
    console.log('   - { batch: 1 }');
    console.log('   - { expiresAt: 1 }');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
};

fixEnrollmentIndexes();


