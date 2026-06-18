const mongoose = require('mongoose');

const fishermenProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    licenseNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    licenseExpiry: Date,
    licenseImageUrl: {
      type: String,
      default: null, // Cloudinary URL - wired later
    },
    village: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, default: 'Tamil Nadu', trim: true },
    aadhaarNo: { type: String, select: false },
    bankAccountNo: { type: String, select: false },
    ifscCode: { type: String },
    profileImageUrl: { type: String, default: null },
    yearsOfExperience: { type: Number, default: 0 },
    memberOfCooperative: { type: Boolean, default: false },
    cooperativeName: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FishermenProfile', fishermenProfileSchema);
