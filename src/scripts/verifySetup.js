// Script to verify production setup
import dotenv from 'dotenv';
import { verifyEmailConfig } from '../services/emailService.js';
import connectDB from '../config/database.js';
import logger from '../utils/logger.js';

dotenv.config();

const verifySetup = async () => {
  const checks = {
    environment: {},
    database: {},
    email: {},
    security: {},
  };

  console.log('========================================');
  console.log('Production Setup Verification');
  console.log('========================================\n');

  // Check environment
  console.log('1. Environment Variables:');
  const requiredEnvVars = [
    'NODE_ENV',
    'MONGODB_URI',
    'JWT_SECRET',
    'FRONTEND_URL',
  ];

  const optionalEnvVars = [
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASS',
  ];

  let envOk = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✓ ${envVar}: Set`);
      checks.environment[envVar] = 'ok';
    } else {
      console.log(`   ✗ ${envVar}: Missing`);
      checks.environment[envVar] = 'missing';
      envOk = false;
    }
  }

  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✓ ${envVar}: Set`);
    } else {
      console.log(`   ⚠ ${envVar}: Not set (optional)`);
    }
  }

  // Check JWT secret strength
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length >= 32) {
      console.log(`   ✓ JWT_SECRET: Strong (${process.env.JWT_SECRET.length} chars)`);
      checks.security.jwtSecret = 'strong';
    } else {
      console.log(`   ⚠ JWT_SECRET: Weak (${process.env.JWT_SECRET.length} chars, min 32)`);
      checks.security.jwtSecret = 'weak';
    }
  }

  // Check database
  console.log('\n2. Database Connection:');
  try {
    await connectDB();
    console.log('   ✓ Database: Connected');
    checks.database.connection = 'ok';
  } catch (error) {
    console.log(`   ✗ Database: Connection failed - ${error.message}`);
    checks.database.connection = 'failed';
  }

  // Check email
  console.log('\n3. Email Service:');
  const emailCheck = await verifyEmailConfig();
  if (emailCheck.configured) {
    console.log(`   ✓ Email: ${emailCheck.message}`);
    checks.email.service = 'ok';
  } else {
    console.log(`   ⚠ Email: ${emailCheck.message}`);
    checks.email.service = 'not_configured';
  }

  // Summary
  console.log('\n========================================');
  console.log('Summary:');
  console.log('========================================');
  
  const allChecks = [
    ...Object.values(checks.environment),
    checks.database.connection,
  ];

  if (allChecks.every(check => check === 'ok')) {
    console.log('✓ All critical checks passed');
    if (checks.email.service === 'not_configured') {
      console.log('⚠ Email service not configured (notifications will not work)');
    }
    console.log('\nSystem is ready for production!');
  } else {
    console.log('✗ Some checks failed - please fix before deploying');
  }

  process.exit(0);
};

verifySetup().catch((error) => {
  console.error('Verification error:', error);
  process.exit(1);
});


