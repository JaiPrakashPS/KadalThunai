const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter ID is required'],
    },
    type: {
      type: String,
      enum: ['storm', 'oil_spill', 'debris', 'boat_accident', 'obstacle', 'suspicious_activity', 'other'],
      required: [true, 'Incident type is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: 2000,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      name: String,
    },
    imageUrl: {
      type: String,
      default: null, // Cloudinary - wired later
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'dismissed'],
      default: 'pending',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: Date,
    officerNotes: { type: String, maxlength: 1000 },
    syncSource: {
      type: String,
      enum: ['local', 'server'],
      default: 'server',
    },
    localId: { type: String },
  },
  { timestamps: true }
);

incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ reportedBy: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
