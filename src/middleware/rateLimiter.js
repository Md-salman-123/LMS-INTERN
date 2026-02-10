// Simple rate limiter middleware
// For production, consider using express-rate-limit package

const rateLimitMap = new Map();

export const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(clientId)) {
      rateLimitMap.set(clientId, []);
    }

    const requests = rateLimitMap.get(clientId);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter((time) => time > windowStart);
    rateLimitMap.set(clientId, recentRequests);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
      });
    }

    // Add current request
    recentRequests.push(now);
    next();
  };
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  for (const [key, requests] of rateLimitMap.entries()) {
    const recentRequests = requests.filter((time) => time > now - windowMs);
    if (recentRequests.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, recentRequests);
    }
  }
}, 60 * 1000); // Clean up every minute


