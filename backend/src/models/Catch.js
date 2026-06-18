const mongoose = require('mongoose');

const catchSchema = new mongoose.Schema(
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
    species: {
      type: String,
      required: [true, 'Fish species is required'],
      trim: true,
    },
    speciesTamil: { type: String, trim: true },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0, 'Weight cannot be negative'],
    },
    weightUnit: {
      type: String,
      enum: ['kg', 'g', 'quintal'],
      default: 'kg',
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      name: { type: String },
    },
    catchDate: {
      type: Date,
      required: [true, 'Catch date is required'],
      default: Date.now,
    },
    earnings: {
      type: Number,
      default: 0,
      min: [0, 'Earnings cannot be negative'],
    },
    currency: { type: String, default: 'INR' },
    notes: { type: String, maxlength: 500 },
    syncSource: {
      type: String,
      enum: ['local', 'server'],
      default: 'server',
    },
    localId: { type: String }, // expo-sqlite local_id reference
  },
  { timestamps: true }
);

catchSchema.index({ fishermenId: 1, catchDate: -1 });
catchSchema.index({ catchDate: -1 });

module.exports = mongoose.model('Catch', catchSchema);
