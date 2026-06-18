const Incident = require('../models/Incident');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');

const getIncidents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.user.role === 'fisherman') filter.reportedBy = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [incidents, total] = await Promise.all([
    Incident.find(filter).populate('reportedBy', 'name phone').populate('resolvedBy', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
    Incident.countDocuments(filter),
  ]);
  res.json({ success: true, data: incidents, pagination: paginateMeta(total, page, limit) });
});

const createIncident = asyncHandler(async (req, res) => {
  const { location, ...rest } = req.body;
  let normalizedLocation = location;
  if (location && location.latitude !== undefined && location.longitude !== undefined) {
    normalizedLocation = {
      lat: Number(location.latitude),
      lng: Number(location.longitude),
      name: location.name || ''
    };
  }
  const incident = await Incident.create({
    ...rest,
    location: normalizedLocation,
    reportedBy: req.user._id,
    syncSource: req.body.localId ? 'local' : 'server',
  });
  res.status(201).json({ success: true, message: 'Incident reported.', data: incident });
});

const syncIncidents = asyncHandler(async (req, res) => {
  const { records } = req.body;
  const results = [];
  for (const record of records || []) {
    try {
      const { location, ...rest } = record;
      let normalizedLocation = location;
      if (location && location.latitude !== undefined && location.longitude !== undefined) {
        normalizedLocation = {
          lat: Number(location.latitude),
          lng: Number(location.longitude),
          name: location.name || ''
        };
      }
      const saved = await Incident.create({
        ...rest,
        location: normalizedLocation,
        reportedBy: req.user._id,
        syncSource: 'local',
      });
      results.push({ localId: record.localId, serverId: saved._id, success: true });
    } catch (err) {
      results.push({ localId: record.localId, success: false, error: err.message });
    }
  }
  res.json({ success: true, data: results });
});

const getIncidentById = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id).populate('reportedBy', 'name phone').populate('resolvedBy', 'name');
  if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });
  res.json({ success: true, data: incident });
});

const updateIncident = asyncHandler(async (req, res) => {
  const { status, officerNotes } = req.body;
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });
  if (status) incident.status = status;
  if (officerNotes) incident.officerNotes = officerNotes;
  if (status === 'resolved') { incident.resolvedBy = req.user._id; incident.resolvedAt = new Date(); }
  await incident.save();
  res.json({ success: true, message: 'Incident updated.', data: incident });
});

module.exports = { getIncidents, createIncident, syncIncidents, getIncidentById, updateIncident };
