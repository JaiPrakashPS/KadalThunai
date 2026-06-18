const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema(
  {
    species: {
      type: String,
      required: [true, 'Species name is required'],
      trim: true,
    },
    speciesTamil: { type: String, trim: true },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    minPrice: { type: Number },
    maxPrice: { type: Number },
    unit: {
      type: String,
      enum: ['kg', 'piece', 'dozen', 'quintal'],
      default: 'kg',
    },
    market: {
      type: String,
      required: [true, 'Market name is required'],
      trim: true,
    },
    district: { type: String, trim: true },
    state: { type: String, default: 'Tamil Nadu', trim: true },
    priceDate: {
      type: Date,
      required: [true, 'Price date is required'],
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['officer', 'fmpis', 'dataset', 'auto'],
      default: 'officer',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

marketPriceSchema.index({ species: 1, priceDate: -1 });
marketPriceSchema.index({ district: 1, priceDate: -1 });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
