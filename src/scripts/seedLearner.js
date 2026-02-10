import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import connectDB from '../config/database.js';

dotenv.config();

const LEARNER_EMAIL = process.env.LEARNER_EMAIL || 'learner@lms.com';
const LEARNER_PASSWORD = process.env.LEARNER_PASSWORD || 'learner123';

const createLearnerUser = async () => {
  try {
    await connectDB();

    const existing = await User.findOne({ email: LEARNER_EMAIL });
    if (existing) {
      existing.password = LEARNER_PASSWORD;
      existing.role = 'learner';
      existing.status = 'active';
      await existing.save();
      console.log('========================================');
      console.log('Learner user updated!');
      console.log('========================================');
      console.log(`Email: ${LEARNER_EMAIL}`);
      console.log(`Password: ${LEARNER_PASSWORD}`);
      console.log('Role: learner');
      console.log('========================================');
      process.exit(0);
    }

    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({ name: 'Default Organization' });
      console.log('Organization created');
    }

    await User.create({
      email: LEARNER_EMAIL,
      password: LEARNER_PASSWORD,
      role: 'learner',
      status: 'active',
      organization: org._id,
      profile: { firstName: 'Learner', lastName: 'User' },
    });

    console.log('========================================');
    console.log('Learner created successfully!');
    console.log('========================================');
    console.log(`Email: ${LEARNER_EMAIL}`);
    console.log(`Password: ${LEARNER_PASSWORD}`);
    console.log('Role: learner');
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('Error creating learner:', error);
    process.exit(1);
  }
};

createLearnerUser();
