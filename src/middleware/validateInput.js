import { sanitizeInput, validateEmail, validatePassword, validateObjectId } from '../utils/validator.js';

// Middleware to sanitize request body
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeInput(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};

// Validation middleware for common fields
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Valid email is required',
    });
  }

  if (!password || !validatePassword(password)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters',
    });
  }

  next();
};

export const validateObjectIdParam = (req, res, next) => {
  const { id } = req.params;
  
  if (!validateObjectId(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
  }

  next();
};


