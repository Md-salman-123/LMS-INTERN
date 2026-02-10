// Setup script to create .env file with required configuration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');

// Generate JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

const envContent = `# Server Configuration
NODE_ENV=development
PORT=5001

# Database Configuration
# For local MongoDB (no authentication):
MONGODB_URI=mongodb://localhost:27017/lms

# For MongoDB with authentication (Docker):
# MONGODB_URI=mongodb://admin:change-this-password@localhost:27017/lms?authSource=admin

# For MongoDB Atlas (cloud):


# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRE=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Email Configuration (Optional - for notifications)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-specific-password
# EMAIL_FROM=noreply@lms.com

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting (Production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database Indexes (set to 'true' to create indexes on startup)
CREATE_INDEXES_ON_START=false
`;

try {
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists!');
    console.log('If you want to regenerate it, please delete the existing file first.');
    console.log(`Location: ${envPath}`);
    process.exit(1);
  }

  // Write .env file
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('========================================');
  console.log('✅ .env file created successfully!');
  console.log('========================================');
  console.log(`Location: ${envPath}`);
  console.log('');
  console.log('Generated JWT_SECRET:', jwtSecret.substring(0, 20) + '...');
  console.log('');
  console.log('⚠️  IMPORTANT:');
  console.log('1. Make sure MongoDB is running on localhost:27017');
  console.log('2. If using Docker MongoDB, update MONGODB_URI in .env');
  console.log('3. If using MongoDB Atlas, update MONGODB_URI with your connection string');
  console.log('4. Restart your backend server after creating .env');
  console.log('========================================');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  console.error('');
  console.error('Please create .env file manually with the following content:');
  console.error('');
  console.error(envContent);
  process.exit(1);
}


