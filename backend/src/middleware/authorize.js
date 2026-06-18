/**
 * Middleware factory: restrict access by user role
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not authorized to access this resource.`,
    });
  }

  next();
};

module.exports = authorize;
