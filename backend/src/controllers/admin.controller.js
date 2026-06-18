const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');

const getOverview = asyncHandler(async (req, res) => {
  const Catch = require('../models/Catch');
  const SosRequest = require('../models/SosRequest');
  const Boat = require('../models/Boat');

  const safeCount = async (model, filter = {}) => { try { return await model.countDocuments(filter); } catch { return 0; } };

  const [fishermen, officers, catches, sos, boats, sosPending] = await Promise.all([
    safeCount(User, { role: 'fisherman' }),
    safeCount(User, { role: 'officer' }),
    safeCount(Catch),
    safeCount(SosRequest),
    safeCount(Boat),
    safeCount(SosRequest, { status: 'pending' }),
  ]);

  res.json({ success: true, data: { fishermen: { total: fishermen }, officers: { total: officers }, catches: { total: catches }, boats: { total: boats }, sos: { total: sos, pending: sosPending } } });
});

const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  const [users, total] = await Promise.all([User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }), User.countDocuments(filter)]);
  res.json({ success: true, data: users, pagination: paginateMeta(total, page, limit) });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'Status updated.', data: user });
});

const createOfficer = asyncHandler(async (req, res) => {
  const { name, email, password, phone, designation, district, badgeNumber, preferredLanguage } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: 'Email already registered.' });
  const user = await User.create({ name, email, passwordHash: password, phone, role: 'officer', preferredLanguage: preferredLanguage || 'ta', isActive: true, isVerified: true });
  try {
    const FisheriesOfficer = require('../models/FisheriesOfficer');
    await FisheriesOfficer.create({ userId: user._id, designation: designation || 'Fisheries Inspector', district: district || '', badgeNo: badgeNumber || '' });
  } catch (e) { console.warn('FisheriesOfficer profile skip:', e.message); }
  res.status(201).json({ success: true, message: 'Officer created.', data: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

const getOfficers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const [users, total] = await Promise.all([User.find({ role: 'officer' }).skip(skip).limit(limit).sort({ createdAt: -1 }), User.countDocuments({ role: 'officer' })]);
  res.json({ success: true, data: users, pagination: paginateMeta(total, page, limit) });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit } = paginate(req.query);
  res.json({ success: true, data: [], pagination: paginateMeta(0, page, limit) });
});

module.exports = { getOverview, getUsers, updateUserStatus, createOfficer, getOfficers, getAuditLogs };
