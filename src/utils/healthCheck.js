// Health check utility
import mongoose from 'mongoose';

export const checkHealth = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      memory: 'unknown',
    },
  };

  // Check database connection
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.database = 'connected';
    } else {
      health.services.database = 'disconnected';
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.services.database = 'error';
    health.status = 'unhealthy';
  }

  // Check memory usage
  try {
    const used = process.memoryUsage();
    health.services.memory = {
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    };
  } catch (error) {
    health.services.memory = 'error';
  }

  return health;
};


