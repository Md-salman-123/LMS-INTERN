import { verifyToken } from '../config/jwt.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    try {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.userId).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      if (req.user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Account is inactive',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Optional authentication - sets req.user if token is provided, but doesn't fail if not
export const optionalAuthenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // No token provided - continue without setting req.user
      return next();
    }

    try {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.userId).select('-password');
      
      if (!req.user || req.user.status !== 'active') {
        // Invalid or inactive user - continue without setting req.user
        req.user = null;
      }
    } catch (error) {
      // Invalid token - continue without setting req.user
      req.user = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

