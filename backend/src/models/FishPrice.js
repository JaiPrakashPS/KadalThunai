const mongoose = require('mongoose');

const fishPriceSchema = new mongoose.Schema(
  {
    fishName: {
      type: String,
      required: [true, 'Fish name is required'],
      trim: true,
    },
    fishNameTamil: {
      type: String,
      trim: true,
    },
    market: {
      type: String,
      required: [true, 'Market name is required'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
    },
    state: {
      type: String,
      default: 'Tamil Nadu',
      trim: true,
    },
    wholesalePrice: {
      type: Number,
      required: [true, 'Wholesale price is required'],
      min: [0, 'Wholesale price cannot be negative'],
    },
    retailPrice: {
      type: Number,
      required: [true, 'Retail price is required'],
      min: [0, 'Retail price cannot be negative'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

fishPriceSchema.index({ fishName: 1, date: -1 });
fishPriceSchema.index({ district: 1, date: -1 });
fishPriceSchema.index({ market: 1, date: -1 });

module.exports = mongoose.model('FishPrice', fishPriceSchema);
