import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import connectDB from '../config/database.js';

// Load env vars
dotenv.config();

const createTrainerUser = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if trainer user already exists
    const existingTrainer = await User.findOne({ email: 'trainer@lms.com' });
    if (existingTrainer) {
      existingTrainer.password = 'trainer123';
      existingTrainer.role = 'trainer';
      existingTrainer.status = 'active';
      await existingTrainer.save();
      console.log('========================================');
      console.log('Trainer user updated!');
      console.log('========================================');
      console.log('Email: trainer@lms.com');
      console.log('Password: trainer123');
      console.log('Role: trainer');
      console.log('========================================');
      console.log('⚠️  IMPORTANT: Change this password after first login!');
      console.log('========================================');
      process.exit(0);
    }

    // Create or get organization
    let organization = await Organization.findOne();
    if (!organization) {
      organization = await Organization.create({
        name: 'Default Organization',
      });
      console.log('Organization created');
    }

    // Create trainer user
    const trainerUser = await User.create({
      email: 'trainer@lms.com',
      password: 'trainer123', // Default password - change this after first login!
      role: 'trainer',
      status: 'active',
      organization: organization._id,
      profile: {
        firstName: 'Trainer',
        lastName: 'User',
      },
    });

    console.log('========================================');
    console.log('Trainer user created successfully!');
    console.log('========================================');
    console.log('Email: trainer@lms.com');
    console.log('Password: trainer123');
    console.log('Role: trainer');
    console.log('========================================');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('Error creating trainer user:', error);
    process.exit(1);
  }
};

createTrainerUser();

