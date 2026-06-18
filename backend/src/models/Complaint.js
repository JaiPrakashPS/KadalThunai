const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitter ID is required'],
    },
    category: {
      type: String,
      enum: ['illegal_fishing', 'pollution', 'equipment', 'safety', 'corruption', 'other'],
      required: [true, 'Complaint category is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: 3000,
    },
    location: {
      lat: Number,
      lng: Number,
      name: String,
    },
    attachmentUrl: {
      type: String,
      default: null, // Cloudinary - wired later
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'resolved', 'rejected'],
      default: 'submitted',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    officerResponse: { type: String, maxlength: 2000 },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: Date,
    syncSource: {
      type: String,
      enum: ['local', 'server'],
      default: 'server',
    },
    localId: { type: String },
  },
  { timestamps: true }
);

complaintSchema.index({ submittedBy: 1 });
complaintSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
