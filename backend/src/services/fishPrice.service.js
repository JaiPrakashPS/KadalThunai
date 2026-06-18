const axios = require('axios');
const { dataGov } = require('../config/env');

/**
 * Fetch fish market prices from data.gov.in open dataset
 * Dataset: Fish Prices - Current Daily Prices of Important Varieties of Fish
 * Resource ID: 9ef84268-d588-465a-a308-a864a43d0070 (example - verify actual ID)
 */
const fetchFromDataGovIn = async (district = null, limit = 50) => {
  if (!dataGov.apiKey) {
    console.warn('⚠️  DATA_GOV_API_KEY not set. Returning empty dataset.');
    return [];
  }

  try {
    const params = {
      'api-key': dataGov.apiKey,
      format: 'json',
      limit,
    };

    if (district) {
      params['filters[District]'] = district;
    }

    // data.gov.in APMC / FMPIS fish price dataset
    const res = await axios.get(
      'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
      { params, timeout: 10000 }
    );

    const records = res.data?.records || [];

    return records.map((r) => ({
      species: r.Commodity || r.commodity || r.fish_name || 'Unknown',
      market: r.Market || r.market_name || 'Unknown',
      district: r.District || r.district || district || 'Tamil Nadu',
      state: r.State || 'Tamil Nadu',
      minPrice: parseFloat(r.Min_x0020_Price || r.min_price || 0),
      maxPrice: parseFloat(r.Max_x0020_Price || r.max_price || 0),
      price: parseFloat(r.Modal_x0020_Price || r.modal_price || 0),
      unit: 'kg',
      priceDate: r.Price_Date || r.date || new Date().toISOString(),
      source: 'dataset',
    }));
  } catch (error) {
    console.error('data.gov.in fetch error:', error.message);
    return [];
  }
};

/**
 * Seed sample Tamil Nadu fish prices for development
 */
const getSamplePrices = () => [
  { species: 'Seer Fish', speciesTamil: 'வஞ்சிரம்', price: 900, market: 'Chennai Fish Market', district: 'Chennai', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Pomfret', speciesTamil: 'வாவல்', price: 600, market: 'Chennai Fish Market', district: 'Chennai', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Prawn', speciesTamil: 'இறால்', price: 700, market: 'Rameswaram Market', district: 'Ramanathapuram', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Tuna', speciesTamil: 'சூரை', price: 350, market: 'Tuticorin Market', district: 'Thoothukudi', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Sardine', speciesTamil: 'மத்தி', price: 80, market: 'Nagapattinam Market', district: 'Nagapattinam', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Mackerel', speciesTamil: 'கானாங்கெழுத்தி', price: 120, market: 'Cuddalore Market', district: 'Cuddalore', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Red Snapper', speciesTamil: 'சங்கரா', price: 450, market: 'Kanyakumari Market', district: 'Kanyakumari', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Crab', speciesTamil: 'நண்டு', price: 500, market: 'Rameswaram Market', district: 'Ramanathapuram', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Lobster', speciesTamil: 'இலங்கை நண்டு', price: 1200, market: 'Chennai Fish Market', district: 'Chennai', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
  { species: 'Catfish', speciesTamil: 'கெளுத்தி', price: 200, market: 'Nagapattinam Market', district: 'Nagapattinam', state: 'Tamil Nadu', unit: 'kg', source: 'dataset' },
];

module.exports = { fetchFromDataGovIn, getSamplePrices };
