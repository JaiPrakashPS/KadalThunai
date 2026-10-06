const mongoose = require('mongoose');

const fishingZoneSchema = new mongoose.Schema(
  {
    fishermanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Fisherman ID is required'],
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    species: {
      type: String,
      required: [true, 'Recommended species is required'],
      trim: true,
    },
    abundance: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    notes: { type: String, maxlength: 500 },
    syncSource: {
      type: String,
      enum: ['local', 'server'],
      default: 'server',
    },
    localId: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

fishingZoneSchema.index({ 'location.lat': 1, 'location.lng': 1 });
fishingZoneSchema.index({ fishermanId: 1 });

module.exports = mongoose.model('FishingZone', fishingZoneSchema);
