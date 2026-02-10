import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import connectDB from '../config/database.js';

dotenv.config();

const USERS = [
  {
    email: 'admin@lms.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
    role: 'super_admin',
    profile: { firstName: 'Super', lastName: 'Admin' },
  },
  {
    email: 'orgadmin@lms.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    profile: { firstName: 'Org', lastName: 'Admin' },
  },
  {
    email: 'trainer@lms.com',
    password: process.env.TRAINER_PASSWORD || 'trainer123',
    role: 'trainer',
    profile: { firstName: 'Trainer', lastName: 'User' },
  },
  {
    email: 'student@lms.com',
    password: process.env.STUDENT_PASSWORD || 'student123',
    role: 'student',
    profile: { firstName: 'Student', lastName: 'User' },
  },
];

const ensureUsers = async () => {
  try {
    await connectDB();

    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({ name: 'Default Organization' });
      console.log('Organization created.');
    }

    console.log('');
    console.log('========== Seed All Roles (super_admin, admin, trainer, student) ==========');
    console.log('');

    for (const u of USERS) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        existing.password = u.password;
        existing.role = u.role;
        existing.status = 'active';
        existing.organization = org._id;
        if (u.profile) {
          if (!existing.profile) existing.profile = {};
          if (u.profile.firstName != null) existing.profile.firstName = u.profile.firstName;
          if (u.profile.lastName != null) existing.profile.lastName = u.profile.lastName;
        }
        await existing.save();
        console.log(`[UPDATED] ${u.role.padEnd(12)} ${u.email}  (password reset, role=${u.role})`);
      } else {
        await User.create({
          email: u.email,
          password: u.password,
          role: u.role,
          status: 'active',
          organization: org._id,
          profile: u.profile,
        });
        console.log(`[CREATED] ${u.role.padEnd(12)} ${u.email}`);
      }
    }

    console.log('');
    console.log('----------------------------------------------------------------------');
    console.log('LOGIN CREDENTIALS');
    console.log('----------------------------------------------------------------------');
    console.log('| Role        | Email            | Password   |');
    console.log('|-------------|------------------|------------|');
    console.log('| super_admin | admin@lms.com    | admin123   |');
    console.log('| admin       | orgadmin@lms.com | admin123   |');
    console.log('| trainer     | trainer@lms.com  | trainer123 |');
    console.log('| student     | student@lms.com  | student123 |');
    console.log('----------------------------------------------------------------------');
    console.log('');
    console.log('Login at: http://localhost:5173/login');
    console.log('Super Admin / Admin → /admin/dashboard  |  Trainer → /trainer/dashboard  |  Student → /dashboard');
    console.log('');
    console.log('⚠️  Change default passwords after first login!');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

ensureUsers();
