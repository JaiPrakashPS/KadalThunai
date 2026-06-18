const mongoose = require('mongoose');

const governmentSchemeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Scheme title is required'],
      trim: true,
      maxlength: 300,
    },
    titleTamil: { type: String, trim: true },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: 5000,
    },
    descriptionTamil: { type: String },
    category: {
      type: String,
      enum: ['subsidy', 'insurance', 'training', 'equipment', 'welfare', 'financial', 'other'],
      default: 'other',
    },
    eligibility: { type: String, maxlength: 2000 },
    eligibilityTamil: { type: String },
    benefits: { type: String, maxlength: 2000 },
    howToApply: { type: String, maxlength: 2000 },
    deadline: Date,
    applicationUrl: String,
    attachmentUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GovernmentScheme', governmentSchemeSchema);
