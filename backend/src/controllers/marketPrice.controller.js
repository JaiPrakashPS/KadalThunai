const MarketPrice = require('../models/MarketPrice');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');
const { fetchFromDataGovIn, getSamplePrices } = require('../services/fishPrice.service');

const getMarketPrices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.species) filter.species = new RegExp(req.query.species, 'i');
  if (req.query.district) filter.district = new RegExp(req.query.district, 'i');
  if (req.query.market) filter.market = new RegExp(req.query.market, 'i');

  const [prices, total] = await Promise.all([
    MarketPrice.find(filter).populate('updatedBy', 'name').skip(skip).limit(limit).sort({ priceDate: -1 }),
    MarketPrice.countDocuments(filter),
  ]);
  res.json({ success: true, data: prices, pagination: paginateMeta(total, page, limit) });
});

const createMarketPrice = asyncHandler(async (req, res) => {
  const price = await MarketPrice.create({ ...req.body, updatedBy: req.user._id, source: 'officer' });
  res.status(201).json({ success: true, message: 'Price added.', data: price });
});

const updateMarketPrice = asyncHandler(async (req, res) => {
  const price = await MarketPrice.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true, runValidators: true });
  if (!price) return res.status(404).json({ success: false, message: 'Price not found.' });
  res.json({ success: true, message: 'Price updated.', data: price });
});

const fetchLivePrices = asyncHandler(async (req, res) => {
  const { district } = req.query;
  let records = await fetchFromDataGovIn(district);

  if (records.length === 0) {
    // Use sample Tamil Nadu prices as fallback
    records = getSamplePrices();
  }

  // Upsert records into DB
  const upserted = [];
  for (const r of records) {
    try {
      const doc = await MarketPrice.findOneAndUpdate(
        { species: r.species, market: r.market, priceDate: { $gte: new Date(new Date().setHours(0,0,0,0)) } },
        { ...r, updatedBy: req.user._id },
        { upsert: true, new: true }
      );
      upserted.push(doc);
    } catch (e) { /* skip duplicates */ }
  }

  res.json({ success: true, message: `Fetched and saved ${upserted.length} price records.`, data: upserted.slice(0, 20) });
});

module.exports = { getMarketPrices, createMarketPrice, updateMarketPrice, fetchLivePrices };
