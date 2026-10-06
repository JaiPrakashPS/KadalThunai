const FishingZone = require('../models/FishingZone');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');

const getZones = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, 100);
  const filter = { isActive: true };
  if (req.query.species) filter.species = new RegExp(req.query.species, 'i');

  const [zones, total] = await Promise.all([
    FishingZone.find(filter)
      .populate('fishermanId', 'name phone')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    FishingZone.countDocuments(filter),
  ]);

  res.json({ success: true, data: zones, pagination: paginateMeta(total, page, limit) });
});

const getZoneById = asyncHandler(async (req, res) => {
  const zone = await FishingZone.findById(req.params.id).populate('fishermanId', 'name phone');
  if (!zone) return res.status(404).json({ success: false, message: 'Recommendation not found.' });
  res.json({ success: true, data: zone });
});

const createZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.create({
    ...req.body,
    fishermanId: req.user._id,
    syncSource: req.body.localId ? 'local' : 'server',
  });
  res.status(201).json({ success: true, message: 'Recommendation recorded.', data: zone });
});

const syncZones = asyncHandler(async (req, res) => {
  const { records } = req.body;
  const results = [];
  for (const record of records || []) {
    try {
      const saved = await FishingZone.create({
        ...record,
        fishermanId: req.user._id,
        syncSource: 'local',
      });
      results.push({ localId: record.localId, serverId: saved._id, success: true });
    } catch (err) {
      results.push({ localId: record.localId, success: false, error: err.message });
    }
  }
  res.json({ success: true, message: `Synced ${results.filter(r => r.success).length} records.`, data: results });
});

const updateZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.findById(req.params.id);
  if (!zone) return res.status(404).json({ success: false, message: 'Recommendation not found.' });

  // Only the reporting fisherman (or admin) can update
  if (req.user.role !== 'admin' && zone.fishermanId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  const updated = await FishingZone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, message: 'Recommendation updated.', data: updated });
});

const deleteZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.findById(req.params.id);
  if (!zone) return res.status(404).json({ success: false, message: 'Recommendation not found.' });

  if (req.user.role !== 'admin' && zone.fishermanId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  await FishingZone.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Recommendation deleted.' });
});

module.exports = { getZones, getZoneById, createZone, syncZones, updateZone, deleteZone };
