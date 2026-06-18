const mongoose = require('mongoose');

const fisheriesOfficerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    badgeNo: {
      type: String,
      required: [true, 'Badge number is required'],
      unique: true,
      trim: true,
    },
    designation: { type: String, trim: true },
    jurisdiction: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, default: 'Tamil Nadu', trim: true },
    officeAddress: { type: String, trim: true },
    officePhone: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FisheriesOfficer', fisheriesOfficerSchema);
