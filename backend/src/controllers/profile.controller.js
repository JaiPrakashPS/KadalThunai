const User = require('../models/User');
const FishermenProfile = require('../models/FishermenProfile');
const FisheriesOfficer = require('../models/FisheriesOfficer');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/v1/profile/me
const getMyProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  let profile = null;

  if (user.role === 'fisherman') {
    profile = await FishermenProfile.findOne({ userId: user._id });
  } else if (user.role === 'officer') {
    profile = await FisheriesOfficer.findOne({ userId: user._id });
  }

  res.json({
    success: true,
    data: { user, profile },
  });
});

// PUT /api/v1/profile/me
const updateMyProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { name, phone, preferredLanguage, fcmToken, ...profileData } = req.body;

  // Update User fields
  if (name || phone || preferredLanguage || fcmToken) {
    await User.findByIdAndUpdate(user._id, { name, phone, preferredLanguage, fcmToken }, { new: true, runValidators: true });
  }

  // Update role-specific profile
  let profile;
  if (user.role === 'fisherman') {
    profile = await FishermenProfile.findOneAndUpdate(
      { userId: user._id },
      { ...profileData },
      { new: true, upsert: true, runValidators: true }
    );
  } else if (user.role === 'officer') {
    profile = await FisheriesOfficer.findOneAndUpdate(
      { userId: user._id },
      { ...profileData },
      { new: true, upsert: true, runValidators: true }
    );
  }

  const updatedUser = await User.findById(user._id);
  res.json({ success: true, message: 'Profile updated.', data: { user: updatedUser, profile } });
});

// GET /api/v1/profile/:id  (officer/admin)
const getProfileById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  let profile = null;
  if (user.role === 'fisherman') {
    profile = await FishermenProfile.findOne({ userId: user._id });
  } else if (user.role === 'officer') {
    profile = await FisheriesOfficer.findOne({ userId: user._id });
  }

  res.json({ success: true, data: { user, profile } });
});

module.exports = { getMyProfile, updateMyProfile, getProfileById };
