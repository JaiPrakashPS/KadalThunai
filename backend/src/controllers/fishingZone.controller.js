const FishingZone = require('../models/FishingZone');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');

const getZones = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, 50);
  const filter = { isActive: true };
  if (req.query.safetyLevel) filter.safetyLevel = req.query.safetyLevel;

  const [zones, total] = await Promise.all([
    FishingZone.find(filter).skip(skip).limit(limit).sort({ updatedAt: -1 }),
    FishingZone.countDocuments(filter),
  ]);

  res.json({ success: true, data: zones, pagination: paginateMeta(total, page, limit) });
});

const getZoneById = asyncHandler(async (req, res) => {
  const zone = await FishingZone.findById(req.params.id);
  if (!zone) return res.status(404).json({ success: false, message: 'Zone not found.' });
  res.json({ success: true, data: zone });
});

const createZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.create({ ...req.body, publishedBy: req.user._id });
  res.status(201).json({ success: true, message: 'Fishing zone created.', data: zone });
});

const updateZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!zone) return res.status(404).json({ success: false, message: 'Zone not found.' });
  res.json({ success: true, message: 'Zone updated.', data: zone });
});

const deleteZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.findByIdAndDelete(req.params.id);
  if (!zone) return res.status(404).json({ success: false, message: 'Zone not found.' });
  res.json({ success: true, message: 'Zone deleted.' });
});

module.exports = { getZones, getZoneById, createZone, updateZone, deleteZone };
