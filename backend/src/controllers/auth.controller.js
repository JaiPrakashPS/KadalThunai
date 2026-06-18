const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const FishermenProfile = require('../models/FishermenProfile');
const FisheriesOfficer = require('../models/FisheriesOfficer');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const asyncHandler = require('../middleware/asyncHandler');

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, preferredLanguage } = req.body;

  // Only allow fisherman self-registration; officers created by admin
  const allowedRoles = ['fisherman'];
  const userRole = allowedRoles.includes(role) ? role : 'fisherman';

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    phone,
    role: userRole,
    preferredLanguage: preferredLanguage || 'ta',
  });

  // Create profile for fisherman
  if (userRole === 'fisherman') {
    await FishermenProfile.create({ userId: user._id });
  }

  const tokens = generateTokens({ id: user._id, role: user.role });

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    },
  });
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const tokens = generateTokens({ id: user._id, role: user.role });

  res.json({
    success: true,
    message: 'Login successful.',
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, preferredLanguage: user.preferredLanguage },
      ...tokens,
    },
  });
});

// POST /api/v1/auth/refresh
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Refresh token required.' });
  }

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }

  const tokens = generateTokens({ id: user._id, role: user.role });

  res.json({ success: true, data: tokens });
});

// POST /api/v1/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ success: true, message: 'If this email exists, a reset link will be sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  // TODO: Send email with resetToken (Email service not configured)
  console.log(`🔐 Password reset token for ${email}: ${resetToken}`);

  res.json({ success: true, message: 'If this email exists, a reset link will be sent.', devToken: process.env.NODE_ENV === 'development' ? resetToken : undefined });
});

// POST /api/v1/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
  }

  user.passwordHash = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successful. Please login.' });
});

module.exports = { register, login, refreshToken, forgotPassword, resetPassword };
