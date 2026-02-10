// Role mapping for backward compatibility
const roleMap = {
  student: 'learner',
  instructor: 'trainer',
  admin: 'admin',
  super_admin: 'super_admin',
};

// Normalize role
const normalizeRole = (role) => {
  return roleMap[role] || role;
};

// Check if role matches (supports aliases)
const roleMatches = (userRole, allowedRoles) => {
  const normalizedUserRole = normalizeRole(userRole);
  return allowedRoles.some((allowedRole) => {
    const normalizedAllowed = normalizeRole(allowedRole);
    return normalizedUserRole === normalizedAllowed;
  });
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    // Support both old and new role names
    const allowedRoles = [
      ...roles,
      // Map aliases
      ...roles.map((r) => {
        if (r === 'student') return 'learner';
        if (r === 'instructor') return 'trainer';
        return r;
      }),
    ];

    if (!roleMatches(req.user.role, allowedRoles)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};

// Helper functions for role checking
export const isSuperAdmin = (user) => user?.role === 'super_admin';
export const isAdmin = (user) => ['super_admin', 'admin'].includes(user?.role);
export const isInstructor = (user) => ['trainer', 'instructor'].includes(user?.role);
export const isStudent = (user) => ['learner', 'student'].includes(user?.role);

// Middleware for specific roles
export const requireSuperAdmin = authorize('super_admin');
export const requireAdmin = authorize('super_admin', 'admin');
export const requireInstructor = authorize('trainer', 'instructor');
export const requireStudent = authorize('learner', 'student');

