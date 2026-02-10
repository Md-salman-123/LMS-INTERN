// Script to create database indexes
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import { createIndexes } from '../utils/dbIndexes.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    await createIndexes();
    console.log('Index creation completed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();


