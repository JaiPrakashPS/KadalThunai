const SosRequest = require('../models/SosRequest');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');
const { sendTopicNotification } = require('../services/notification.stub');

const createSOS = asyncHandler(async (req, res) => {
  let { location, message, emergencyType, emergency_type, latitude, longitude, boatId, localId } = req.body;

  // Map flat latitude/longitude to nested location object
  if (!location && (latitude !== undefined || longitude !== undefined)) {
    location = {
      lat: latitude !== undefined ? Number(latitude) : 0,
      lng: longitude !== undefined ? Number(longitude) : 0
    };
  }

  // Map emergencyType format
  let finalEmergencyType = emergencyType || emergency_type || 'other';
  if (finalEmergencyType === 'breakdown') {
    finalEmergencyType = 'boat_breakdown';
  }

  const sos = await SosRequest.create({
    fishermenId: req.user._id,
    boatId: boatId || null,
    location,
    message: message || 'Emergency! Need immediate assistance.',
    emergencyType: finalEmergencyType,
    localId,
    syncSource: localId ? 'local' : 'server',
  });

  // Stub FCM notification to officers
  await sendTopicNotification({ topic: 'officers', title: '🆘 SOS ALERT', body: `Emergency from ${req.user.name}. Location: ${location.lat}, ${location.lng}` });

  // Store notification record
  await Notification.create({
    title: '🆘 SOS Alert',
    body: `Emergency from fisherman ${req.user.name}`,
    type: 'emergency',
    targetRole: 'officer',
    sentBy: req.user._id,
    priority: 'high',
  });

  res.status(201).json({ success: true, message: 'SOS sent. Help is on the way.', data: sos });
});

const syncSOS = asyncHandler(async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'No SOS records to sync.' });
  }

  const results = [];
  for (const record of records) {
    try {
      let { location, latitude, longitude, emergencyType, emergency_type } = record;

      // Map flat latitude/longitude to nested location object
      if (!location && (latitude !== undefined || longitude !== undefined)) {
        location = {
          lat: latitude !== undefined ? Number(latitude) : 0,
          lng: longitude !== undefined ? Number(longitude) : 0
        };
      }

      // Map emergencyType format
      let finalEmergencyType = emergencyType || emergency_type || 'other';
      if (finalEmergencyType === 'breakdown') {
        finalEmergencyType = 'boat_breakdown';
      }

      const saved = await SosRequest.create({
        ...record,
        location,
        emergencyType: finalEmergencyType,
        fishermenId: req.user._id,
        syncSource: 'local',
      });
      results.push({ localId: record.localId, serverId: saved._id, success: true });
    } catch (err) {
      results.push({ localId: record.localId, success: false, error: err.message });
    }
  }
  res.json({ success: true, data: results });
});

const getSOSRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  // Fishermen see only their own SOS records
  if (req.user.role === 'fisherman') filter.fishermenId = req.user._id;

  const [requests, total] = await Promise.all([
    SosRequest.find(filter)
      .populate('fishermenId', 'name phone')
      .populate('boatId', 'name registrationNo')
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    SosRequest.countDocuments(filter),
  ]);

  // Normalize: add userId alias for admin dashboard compatibility
  const data = requests.map(r => {
    const obj = r.toObject({ virtuals: true });
    obj.userId = obj.fishermenId;
    return obj;
  });

  res.json({ success: true, data, pagination: paginateMeta(total, page, limit) });
});

const updateSOSStatus = asyncHandler(async (req, res) => {
  const { status, officerNotes } = req.body;
  const sos = await SosRequest.findById(req.params.id);
  if (!sos) return res.status(404).json({ success: false, message: 'SOS not found.' });

  sos.status = status;
  sos.officerNotes = officerNotes;
  sos.respondedBy = req.user._id;
  if (!sos.respondedAt) sos.respondedAt = new Date();
  if (status === 'resolved') sos.resolvedAt = new Date();
  await sos.save();

  res.json({ success: true, message: 'SOS status updated.', data: sos });
});

module.exports = { createSOS, syncSOS, getSOSRequests, updateSOSStatus };
