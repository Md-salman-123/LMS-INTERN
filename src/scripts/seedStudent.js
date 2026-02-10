import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import connectDB from '../config/database.js';

dotenv.config();

const STUDENT_EMAIL = process.env.STUDENT_EMAIL || 'student@lms.com';
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || 'student123';

const createStudentUser = async () => {
  try {
    await connectDB();

    const existing = await User.findOne({ email: STUDENT_EMAIL });
    if (existing) {
      existing.password = STUDENT_PASSWORD;
      existing.role = 'student';
      existing.status = 'active';
      await existing.save();
      console.log('========================================');
      console.log('Student user updated!');
      console.log('========================================');
      console.log(`Email: ${STUDENT_EMAIL}`);
      console.log(`Password: ${STUDENT_PASSWORD}`);
      console.log('Role: student');
      console.log('========================================');
      process.exit(0);
    }

    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({ name: 'Default Organization' });
      console.log('Organization created');
    }

    await User.create({
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
      role: 'student',
      status: 'active',
      organization: org._id,
      profile: { firstName: 'Student', lastName: 'User' },
    });

    console.log('========================================');
    console.log('Student created successfully!');
    console.log('========================================');
    console.log(`Email: ${STUDENT_EMAIL}`);
    console.log(`Password: ${STUDENT_PASSWORD}`);
    console.log('Role: student');
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('Error creating student:', error);
    process.exit(1);
  }
};

createStudentUser();
