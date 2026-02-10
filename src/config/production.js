// Production-specific configurations

export const productionConfig = {
  // Disable detailed error messages in production
  showDetailedErrors: false,
  
  // Enable compression
  enableCompression: true,
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  
  // Logging
  logging: {
    level: 'error', // Only log errors in production
    file: './logs/app.log',
  },
  
  // Security
  security: {
    helmet: true,
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  },
};


