// Script to update existing courses to allow self-enrollment
// Run with: node src/scripts/updateEnrollmentTypes.js

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Course from '../models/Course.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });
dotenv.config();

const updateEnrollmentTypes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update all courses with 'manual' enrollment type to 'self'
    const result = await Course.updateMany(
      { enrollmentType: 'manual' },
      { $set: { enrollmentType: 'self' } }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} courses to allow self-enrollment`);
    console.log(`   Total courses matched: ${result.matchedCount}`);
    
    // Show summary
    const enrollmentTypeCounts = await Course.aggregate([
      {
        $group: {
          _id: '$enrollmentType',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📊 Current enrollment type distribution:');
    enrollmentTypeCounts.forEach(({ _id, count }) => {
      console.log(`   ${_id || 'null'}: ${count} courses`);
    });

    console.log('\n✅ Update complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating enrollment types:', error);
    process.exit(1);
  }
};

updateEnrollmentTypes();


