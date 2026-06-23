const FishPrice = require('../models/FishPrice');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');
const { syncDailyPrices } = require('../services/fmpis.service');

/**
 * GET /api/v1/fish-prices
 * Fetch today's current fish prices with query filtering & pagination
 */
const getFishPrices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};

  if (req.query.state) {
    filter.state = new RegExp(req.query.state, 'i');
  }
  if (req.query.district) {
    filter.district = new RegExp(req.query.district, 'i');
  }
  if (req.query.fish) {
    const searchRegex = new RegExp(req.query.fish, 'i');
    filter.$or = [{ fishName: searchRegex }, { fishNameTamil: searchRegex }];
  }

  // To find only the latest records for each fish-market combination,
  // we first filter by matching search query and date, sorting by date descending.
  // By default, we query for records.
  const [prices, total] = await Promise.all([
    FishPrice.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1, fishName: 1 }),
    FishPrice.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: prices,
    pagination: paginateMeta(total, page, limit)
  });
});

/**
 * GET /api/v1/fish-prices/trends
 * Get price trends grouped by date for the last 14 days
 */
const getFishPriceTrends = asyncHandler(async (req, res) => {
  const { fish } = req.query;
  const matchFilter = {};

  if (fish) {
    const searchRegex = new RegExp(fish, 'i');
    matchFilter.$or = [{ fishName: searchRegex }, { fishNameTamil: searchRegex }];
  }

  // Get records from the last 14 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  matchFilter.date = { $gte: startDate };

  const trends = await FishPrice.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          fishName: '$fishName',
          fishNameTamil: '$fishNameTamil',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
        },
        avgWholesalePrice: { $avg: '$wholesalePrice' },
        avgRetailPrice: { $avg: '$retailPrice' }
      }
    },
    {
      $project: {
        _id: 0,
        fishName: '$_id.fishName',
        fishNameTamil: '$_id.fishNameTamil',
        date: '$_id.date',
        wholesalePrice: { $round: ['$avgWholesalePrice', 0] },
        retailPrice: { $round: ['$avgRetailPrice', 0] }
      }
    },
    { $sort: { date: 1 } }
  ]);

  res.json({
    success: true,
    data: trends
  });
});

/**
 * POST /api/v1/fish-prices/sync
 * Manually trigger daily sync task (for admin / officer)
 */
const triggerSync = asyncHandler(async (req, res) => {
  await syncDailyPrices();
  res.json({
    success: true,
    message: 'Fish prices synchronized successfully.'
  });
});

/**
 * POST /api/v1/fish-prices
 * Add a manual price entry (officer / admin)
 */
const createFishPrice = asyncHandler(async (req, res) => {
  const { fishName, fishNameTamil, market, district, state, wholesalePrice, retailPrice, date } = req.body;

  if (!fishName || !market || !district || wholesalePrice == null || retailPrice == null) {
    return res.status(400).json({
      success: false,
      message: 'Species, Market, District, Wholesale Price and Retail Price are required.'
    });
  }

  const recordDate = date ? new Date(date) : new Date();
  recordDate.setHours(0, 0, 0, 0);

  const priceEntry = await FishPrice.create({
    fishName,
    fishNameTamil,
    market,
    district,
    state: state || 'Tamil Nadu',
    wholesalePrice: parseFloat(wholesalePrice),
    retailPrice: parseFloat(retailPrice),
    date: recordDate,
    lastUpdated: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'Price entry recorded.',
    data: priceEntry
  });
});

/**
 * PUT /api/v1/fish-prices/:id
 * Update a manual price entry (officer / admin)
 */
const updateFishPrice = asyncHandler(async (req, res) => {
  const { fishName, fishNameTamil, market, district, state, wholesalePrice, retailPrice, date } = req.body;

  const priceRecord = await FishPrice.findById(req.params.id);
  if (!priceRecord) {
    return res.status(404).json({
      success: false,
      message: 'Price record not found.'
    });
  }

  const updateFields = {
    lastUpdated: new Date()
  };

  if (fishName) updateFields.fishName = fishName;
  if (fishNameTamil) updateFields.fishNameTamil = fishNameTamil;
  if (market) updateFields.market = market;
  if (district) updateFields.district = district;
  if (state) updateFields.state = state;
  if (wholesalePrice != null) updateFields.wholesalePrice = parseFloat(wholesalePrice);
  if (retailPrice != null) updateFields.retailPrice = parseFloat(retailPrice);
  if (date) {
    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0);
    updateFields.date = recordDate;
  }

  const updatedRecord = await FishPrice.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Price entry updated.',
    data: updatedRecord
  });
});

module.exports = {
  getFishPrices,
  getFishPriceTrends,
  triggerSync,
  createFishPrice,
  updateFishPrice
};
