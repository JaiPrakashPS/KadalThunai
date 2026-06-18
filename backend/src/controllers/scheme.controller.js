const GovernmentScheme = require('../models/GovernmentScheme');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');

const getSchemes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.user.role === 'admin' && req.query.all === 'true') delete filter.isActive;

  const [schemes, total] = await Promise.all([
    GovernmentScheme.find(filter).populate('publishedBy', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
    GovernmentScheme.countDocuments(filter),
  ]);
  res.json({ success: true, data: schemes, pagination: paginateMeta(total, page, limit) });
});

const getSchemeById = asyncHandler(async (req, res) => {
  const scheme = await GovernmentScheme.findById(req.params.id).populate('publishedBy', 'name');
  if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });
  res.json({ success: true, data: scheme });
});

const createScheme = asyncHandler(async (req, res) => {
  const scheme = await GovernmentScheme.create({ ...req.body, publishedBy: req.user._id });
  res.status(201).json({ success: true, message: 'Scheme created.', data: scheme });
});

const updateScheme = asyncHandler(async (req, res) => {
  const scheme = await GovernmentScheme.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });
  res.json({ success: true, message: 'Scheme updated.', data: scheme });
});

const deleteScheme = asyncHandler(async (req, res) => {
  const scheme = await GovernmentScheme.findByIdAndDelete(req.params.id);
  if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found.' });
  res.json({ success: true, message: 'Scheme deleted.' });
});

module.exports = { getSchemes, getSchemeById, createScheme, updateScheme, deleteScheme };
