const Complaint = require('../models/Complaint');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');

const getComplaints = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.user.role === 'fisherman') filter.submittedBy = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter).populate('submittedBy', 'name phone').populate('assignedTo', 'name').populate('resolvedBy', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
    Complaint.countDocuments(filter),
  ]);
  res.json({ success: true, data: complaints, pagination: paginateMeta(total, page, limit) });
});

const createComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.create({ ...req.body, submittedBy: req.user._id, syncSource: req.body.localId ? 'local' : 'server' });
  res.status(201).json({ success: true, message: 'Complaint submitted.', data: complaint });
});

const syncComplaints = asyncHandler(async (req, res) => {
  const { records } = req.body;
  const results = [];
  for (const record of records || []) {
    try {
      const saved = await Complaint.create({ ...record, submittedBy: req.user._id, syncSource: 'local' });
      results.push({ localId: record.localId, serverId: saved._id, success: true });
    } catch (err) {
      results.push({ localId: record.localId, success: false, error: err.message });
    }
  }
  res.json({ success: true, data: results });
});

const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate('submittedBy', 'name phone').populate('assignedTo', 'name');
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  res.json({ success: true, data: complaint });
});

const updateComplaint = asyncHandler(async (req, res) => {
  const { status, officerResponse, assignedTo } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  if (status) complaint.status = status;
  if (officerResponse) complaint.officerResponse = officerResponse;
  if (assignedTo) complaint.assignedTo = assignedTo;
  if (status === 'resolved') { complaint.resolvedBy = req.user._id; complaint.resolvedAt = new Date(); }
  await complaint.save();
  res.json({ success: true, message: 'Complaint updated.', data: complaint });
});

module.exports = { getComplaints, createComplaint, syncComplaints, getComplaintById, updateComplaint };
