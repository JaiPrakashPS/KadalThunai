const asyncHandler = require('../middleware/asyncHandler');

const safeCount = async (model, filter = {}) => {
  try { return await model.countDocuments(filter); } catch { return 0; }
};

const getOverview = asyncHandler(async (req, res) => {
  const User       = require('../models/User');
  const Catch      = require('../models/Catch');
  const SosRequest = require('../models/SosRequest');
  const Boat       = require('../models/Boat');
  const Incident   = require('../models/Incident');
  const Complaint  = require('../models/Complaint');

  const [fishermen, officers, catches, sosPending, sosTotal, boats, incidentOpen, complaintOpen] = await Promise.all([
    safeCount(User, { role: 'fisherman' }),
    safeCount(User, { role: 'officer' }),
    safeCount(Catch),
    safeCount(SosRequest, { status: 'pending' }),
    safeCount(SosRequest),
    safeCount(Boat),
    safeCount(Incident, { status: { $in: ['submitted', 'under_review'] } }),
    safeCount(Complaint, { status: { $in: ['open', 'under_review'] } }),
  ]);

  res.json({
    success: true,
    data: {
      fishermen:  { total: fishermen },
      officers:   { total: officers },
      catches:    { total: catches },
      boats:      { total: boats },
      sos:        { total: sosTotal, pending: sosPending },
      incidents:  { open: incidentOpen },
      complaints: { open: complaintOpen },
    },
  });
});

const getCatchAnalytics = asyncHandler(async (req, res) => {
  const Catch = require('../models/Catch');
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const [monthlyStats, topSpecies] = await Promise.all([
    Catch.aggregate([
      { $match: { catchDate: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) } } },
      { $group: { _id: { month: { $month: '$catchDate' } }, totalWeight: { $sum: '$weight' }, totalEarnings: { $sum: '$earnings' }, catchCount: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } },
    ]),
    Catch.aggregate([
      { $group: { _id: '$species', totalWeight: { $sum: '$weight' }, count: { $sum: 1 } } },
      { $sort: { totalWeight: -1 } },
      { $limit: 10 },
    ]),
  ]);
  res.json({ success: true, data: { monthlyStats, topSpecies } });
});

const getSOSAnalytics = asyncHandler(async (req, res) => {
  const SosRequest = require('../models/SosRequest');
  const [byStatus, byType] = await Promise.all([
    SosRequest.aggregate([{ $group: { _id: '$status',        count: { $sum: 1 } } }]),
    SosRequest.aggregate([{ $group: { _id: '$emergencyType', count: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, data: { byStatus, byType } });
});

const getIncidentAnalytics = asyncHandler(async (req, res) => {
  const Incident = require('../models/Incident');
  const [byStatus, bySeverity] = await Promise.all([
    Incident.aggregate([{ $group: { _id: '$status',   count: { $sum: 1 } } }]),
    Incident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, data: { byStatus, bySeverity } });
});

module.exports = { getOverview, getCatchAnalytics, getSOSAnalytics, getIncidentAnalytics };
