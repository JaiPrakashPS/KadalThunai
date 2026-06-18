const mongoose = require('mongoose');

const fishingZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
    },
    nameTamil: { type: String, trim: true },
    coordinates: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    ],
    centerPoint: {
      lat: Number,
      lng: Number,
    },
    description: { type: String, maxlength: 1000 },
    descriptionTamil: { type: String },
    safetyLevel: {
      type: String,
      enum: ['safe', 'caution', 'restricted', 'danger'],
      default: 'safe',
    },
    recommendedSpecies: [String],
    bestSeasons: [
      {
        type: String,
        enum: ['January', 'February', 'March', 'April', 'May', 'June',
               'July', 'August', 'September', 'October', 'November', 'December'],
      },
    ],
    depthRangeMeters: {
      min: Number,
      max: Number,
    },
    distanceFromShoreKm: Number,
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FishingZone', fishingZoneSchema);
