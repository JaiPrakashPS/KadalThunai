const mongoose = require('mongoose');

const sosRequestSchema = new mongoose.Schema(
  {
    fishermenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Fisherman ID is required'],
    },
    boatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boat',
      default: null,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: Number,
    },
    message: {
      type: String,
      default: 'Emergency! Need immediate assistance.',
      maxlength: 500,
    },
    emergencyType: {
      type: String,
      enum: ['medical', 'boat_breakdown', 'weather', 'capsized', 'lost', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['pending', 'acknowledged', 'dispatched', 'resolved', 'false_alarm'],
      default: 'pending',
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    respondedAt: Date,
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

sosRequestSchema.index({ status: 1, createdAt: -1 });
sosRequestSchema.index({ fishermenId: 1 });

module.exports = mongoose.model('SosRequest', sosRequestSchema);
