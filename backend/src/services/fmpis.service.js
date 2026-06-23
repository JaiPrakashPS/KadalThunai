const FishPrice = require('../models/FishPrice');

// Base species with standard wholesale/retail margins
const SPECIES_BASE = [
  { fishName: 'Seer Fish', fishNameTamil: 'வஞ்சிரம்', wholesaleBase: 800, retailBase: 950 },
  { fishName: 'Pomfret', fishNameTamil: 'வாவல்', wholesaleBase: 500, retailBase: 620 },
  { fishName: 'Prawn', fishNameTamil: 'இறால்', wholesaleBase: 600, retailBase: 720 },
  { fishName: 'Tuna', fishNameTamil: 'சூரை', wholesaleBase: 280, retailBase: 350 },
  { fishName: 'Sardine', fishNameTamil: 'மத்தி', wholesaleBase: 60, retailBase: 90 },
  { fishName: 'Mackerel', fishNameTamil: 'கானாங்கெழுத்தி', wholesaleBase: 95, retailBase: 130 },
  { fishName: 'Red Snapper', fishNameTamil: 'சங்கரா', wholesaleBase: 380, retailBase: 460 },
  { fishName: 'Crab', fishNameTamil: 'நண்டு', wholesaleBase: 400, retailBase: 520 },
  { fishName: 'Lobster', fishNameTamil: 'இலங்கை நண்டு', wholesaleBase: 1100, retailBase: 1350 }
];

// Markets and districts
const MARKETS = [
  { market: 'Chennai Fish Market', district: 'Chennai' },
  { market: 'Cuddalore Harbour Market', district: 'Cuddalore' },
  { market: 'Nagapattinam Port Market', district: 'Nagapattinam' },
  { market: 'Rameswaram Beach Market', district: 'Ramanathapuram' },
  { market: 'Thoothukudi Harbour Market', district: 'Thoothukudi' },
  { market: 'Kanyakumari Main Market', district: 'Kanyakumari' }
];

/**
 * Generate a randomized price variation
 */
const getFluctuatedPrice = (basePrice, dayOffset) => {
  // Use dayOffset to make the price trend look logical and connected rather than completely random
  const trendFactor = Math.sin(dayOffset * 0.5) * 0.05; // -5% to +5% smooth curve
  const randomFactor = (Math.random() - 0.5) * 0.04; // -2% to +2% daily noise
  const multiplier = 1 + trendFactor + randomFactor;
  return Math.round(basePrice * multiplier);
};

/**
 * Seed historical data for the past 14 days
 */
const seedHistoricalPrices = async () => {
  try {
    const count = await FishPrice.countDocuments({});
    if (count > 0) {
      console.log('💡 FishPrices database already contains data. Skipping seeder.');
      return;
    }

    console.log('🌱 Seeding historical fish prices for the past 14 days...');
    const records = [];
    const now = new Date();

    // Loop through past 14 days
    for (let day = 14; day >= 0; day--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - day);
      // Reset hours to midnight for standard daily prices
      targetDate.setHours(0, 0, 0, 0);

      for (const species of SPECIES_BASE) {
        for (const loc of MARKETS) {
          const wholesale = getFluctuatedPrice(species.wholesaleBase, day);
          const retail = getFluctuatedPrice(species.retailBase, day);

          records.push({
            fishName: species.fishName,
            fishNameTamil: species.fishNameTamil,
            market: loc.market,
            district: loc.district,
            state: 'Tamil Nadu',
            wholesalePrice: wholesale,
            retailPrice: retail,
            date: targetDate,
            lastUpdated: targetDate
          });
        }
      }
    }

    await FishPrice.insertMany(records);
    console.log(`✅ Successfully seeded ${records.length} historical fish prices.`);
  } catch (error) {
    console.error('❌ Error seeding historical fish prices:', error.message);
  }
};

/**
 * Synchronize daily prices (adds new ones for today, updates if already present)
 */
const syncDailyPrices = async () => {
  try {
    console.log('🔄 Synchronizing daily fish prices...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upsertedCount = 0;

    for (const species of SPECIES_BASE) {
      for (const loc of MARKETS) {
        // Daily variation offset based on date
        const dayOffset = today.getDate();
        const wholesale = getFluctuatedPrice(species.wholesaleBase, dayOffset);
        const retail = getFluctuatedPrice(species.retailBase, dayOffset);

        await FishPrice.findOneAndUpdate(
          {
            fishName: species.fishName,
            market: loc.market,
            date: today
          },
          {
            fishNameTamil: species.fishNameTamil,
            district: loc.district,
            state: 'Tamil Nadu',
            wholesalePrice: wholesale,
            retailPrice: retail,
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log('✅ Daily fish prices synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing daily fish prices:', error.message);
  }
};

module.exports = {
  seedHistoricalPrices,
  syncDailyPrices
};
