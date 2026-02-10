import logger from '../utils/logger.js';

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.error('Request failed', logData);
    } else {
      logger.debug('Request completed', logData);
    }
  });

  next();
};


