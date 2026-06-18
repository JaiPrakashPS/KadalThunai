const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const asyncHandler = require('./asyncHandler');

/**
 * Middleware: Verify JWT and attach user to req.user
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.id).select('-passwordHash');

  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is deactivated.' });
  }

  req.user = user;
  next();
});

module.exports = authenticate;
