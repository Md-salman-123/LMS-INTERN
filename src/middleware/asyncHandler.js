// Async error handler wrapper
// Wraps async route handlers to catch errors automatically

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


