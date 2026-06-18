const Catch = require('../models/Catch');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');

// Map offline SQLite field names to MongoDB field names
const mapOfflineRecord = (record) => ({
  species: record.species || record.fish_species || 'Unknown',
  speciesTamil: record.species_tamil || null,
  quantity: parseFloat(record.quantity) || 0,
  weight: parseFloat(record.weight) || 0,
  weightUnit: record.weight_unit || 'kg',
  earnings: parseFloat(record.earnings) || 0,
  location: {
    lat: parseFloat(record.catch_lat) || null,
    lng: parseFloat(record.catch_lng) || null,
    name: record.catch_location_name || null,
  },
  catchDate: record.catch_date || record.catchDate || new Date(),
  notes: record.notes || null,
  boatId: record.boat_id || record.boatId || null,
  localId: String(record.local_id || record.localId || ''),
});

// GET /api/v1/catches
const getCatches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};

  if (req.user.role === 'fisherman') filter.fishermenId = req.user._id;
  if (req.query.species) filter.species = new RegExp(req.query.species, 'i');
  if (req.query.from) filter.catchDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.catchDate = { ...filter.catchDate, $lte: new Date(req.query.to) };

  const [catches, total] = await Promise.all([
    Catch.find(filter)
      .populate('fishermenId', 'name')
      .populate('boatId', 'name registrationNo')
      .skip(skip).limit(limit).sort({ catchDate: -1 }),
    Catch.countDocuments(filter),
  ]);

  res.json({ success: true, data: catches, pagination: paginateMeta(total, page, limit) });
});

// POST /api/v1/catches
const createCatch = asyncHandler(async (req, res) => {
  const body = req.body;
  const catchData = {
    fishermenId: req.user._id,
    syncSource: 'server',
    species: body.species || body.fish_species,
    speciesTamil: body.speciesTamil || body.species_tamil,
    quantity: parseFloat(body.quantity) || 0,
    weight: parseFloat(body.weight) || 0,
    weightUnit: body.weightUnit || body.weight_unit || 'kg',
    earnings: parseFloat(body.earnings) || 0,
    location: body.location || {
      lat: body.catch_lat || null,
      lng: body.catch_lng || null,
      name: body.catch_location_name || null,
    },
    catchDate: body.catchDate || body.catch_date || new Date(),
    notes: body.notes || null,
    boatId: body.boatId || body.boat_id || null,
  };

  const catchRecord = await Catch.create(catchData);
  res.status(201).json({ success: true, message: 'Catch recorded.', data: catchRecord });
});

// POST /api/v1/catches/sync
const syncCatches = asyncHandler(async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'No records to sync.' });
  }

  const results = [];
  for (const record of records) {
    try {
      const mapped = mapOfflineRecord(record);
      const saved = await Catch.create({ ...mapped, fishermenId: req.user._id, syncSource: 'local' });
      results.push({ localId: record.local_id || record.localId, serverId: saved._id, success: true });
    } catch (err) {
      results.push({ localId: record.local_id || record.localId, success: false, error: err.message });
    }
  }

  res.json({
    success: true,
    message: `Synced ${results.filter(r => r.success).length}/${records.length} records.`,
    data: results,
  });
});

// GET /api/v1/catches/summary/monthly
const getMonthlySummary = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear(), month } = req.query;
  const matchFilter = { fishermenId: req.user._id };

  if (year && month) {
    matchFilter.catchDate = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
  } else {
    matchFilter.catchDate = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };
  }

  const summary = await Catch.aggregate([
    { $match: matchFilter },
    { $group: { _id: { month: { $month: '$catchDate' }, year: { $year: '$catchDate' } }, totalWeight: { $sum: '$weight' }, totalEarnings: { $sum: '$earnings' }, catchCount: { $sum: 1 }, species: { $addToSet: '$species' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.json({ success: true, data: { summary, totalEarnings: summary.reduce((s, m) => s + m.totalEarnings, 0), totalWeight: summary.reduce((s, m) => s + m.totalWeight, 0) } });
});

module.exports = { getCatches, createCatch, syncCatches, getMonthlySummary };
