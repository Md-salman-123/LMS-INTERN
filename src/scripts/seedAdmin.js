import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import connectDB from '../config/database.js';

// Load env vars
dotenv.config();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@lms.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
const isCustomCreds = !!(
  process.env.SUPER_ADMIN_EMAIL ||
  process.env.SUPER_ADMIN_PASSWORD
);
const showPassword = (p) =>
  isCustomCreds ? `${'*'.repeat(Math.min(p.length, 8))} (${p.length} chars)` : p;

const createAdminUser = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if super admin already exists (by email)
    const existingAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL });
    if (existingAdmin) {
      existingAdmin.password = SUPER_ADMIN_PASSWORD;
      existingAdmin.role = 'super_admin';
      existingAdmin.status = 'active';
      await existingAdmin.save();
      console.log('========================================');
      console.log('Super Admin user updated!');
      console.log('========================================');
      console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
      console.log(`Password: ${showPassword(SUPER_ADMIN_PASSWORD)}`);
      console.log('Role: super_admin');
      console.log('========================================');
      console.log('⚠️  IMPORTANT: Change password after first login!');
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

    // Create super admin user
    const adminUser = await User.create({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      role: 'super_admin',
      status: 'active',
      organization: organization._id,
      profile: {
        firstName: 'Super',
        lastName: 'Admin',
      },
    });

    console.log('========================================');
    console.log('Super Admin created successfully!');
    console.log('========================================');
    console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`Password: ${showPassword(SUPER_ADMIN_PASSWORD)}`);
    console.log('Role: super_admin');
    console.log('========================================');
    console.log('⚠️  IMPORTANT: Change password after first login!');
    console.log('========================================');
    if (!isCustomCreds) {
      console.log('');
      console.log('Tip: Set SUPER_ADMIN_EMAIL & SUPER_ADMIN_PASSWORD in .env to use custom credentials.');
    }
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createAdminUser();
