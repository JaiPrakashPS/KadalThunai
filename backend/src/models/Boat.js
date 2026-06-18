const mongoose = require('mongoose');

const boatSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    registrationNo: {
      type: String,
      required: [true, 'Boat registration number is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Boat name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['mechanized', 'motorized', 'traditional', 'fiber'],
      required: [true, 'Boat type is required'],
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1'],
    },
    engineNo: { type: String, trim: true },
    engineHorsePower: { type: Number },
    lengthMeters: { type: Number },
    color: { type: String, trim: true },
    material: {
      type: String,
      enum: ['wood', 'fiber', 'steel', 'other'],
      default: 'fiber',
    },
    insuranceNo: { type: String, trim: true },
    insuranceExpiry: Date,
    isActive: { type: Boolean, default: true },
    lastKnownLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

boatSchema.index({ ownerId: 1 });
boatSchema.index({ registrationNo: 1 });

module.exports = mongoose.model('Boat', boatSchema);
