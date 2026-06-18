const Boat = require('../models/Boat');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');

// GET /api/v1/boats
const getBoats = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};

  // Fishermen see only their own boats
  if (req.user.role === 'fisherman') {
    filter.ownerId = req.user._id;
  }

  if (req.query.type) filter.type = req.query.type;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [boats, total] = await Promise.all([
    Boat.find(filter).populate('ownerId', 'name email phone').skip(skip).limit(limit).sort({ createdAt: -1 }),
    Boat.countDocuments(filter),
  ]);

  res.json({ success: true, data: boats, pagination: paginateMeta(total, page, limit) });
});

// POST /api/v1/boats
const createBoat = asyncHandler(async (req, res) => {
  const boat = await Boat.create({ ...req.body, ownerId: req.user._id });
  res.status(201).json({ success: true, message: 'Boat registered.', data: boat });
});

// GET /api/v1/boats/:id
const getBoatById = asyncHandler(async (req, res) => {
  const boat = await Boat.findById(req.params.id).populate('ownerId', 'name email phone');
  if (!boat) return res.status(404).json({ success: false, message: 'Boat not found.' });
  res.json({ success: true, data: boat });
});

// PUT /api/v1/boats/:id
const updateBoat = asyncHandler(async (req, res) => {
  const boat = await Boat.findById(req.params.id);
  if (!boat) return res.status(404).json({ success: false, message: 'Boat not found.' });

  if (req.user.role === 'fisherman' && boat.ownerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this boat.' });
  }

  const updated = await Boat.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, message: 'Boat updated.', data: updated });
});

// DELETE /api/v1/boats/:id
const deleteBoat = asyncHandler(async (req, res) => {
  const boat = await Boat.findById(req.params.id);
  if (!boat) return res.status(404).json({ success: false, message: 'Boat not found.' });

  if (req.user.role === 'fisherman' && boat.ownerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized.' });
  }

  await Boat.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Boat removed.' });
});

module.exports = { getBoats, createBoat, getBoatById, updateBoat, deleteBoat };
