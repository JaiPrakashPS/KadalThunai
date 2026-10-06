/**
 * Seed script to populate crowd-sourced fishing zone recommendations.
 * Run: node scripts/seedFishingZones.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const FishingZone = require('../src/models/FishingZone');
const User = require('../src/models/User');
const { mongoUri } = require('../src/config/env');

const seed = async () => {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB...');

  // Query a fisherman user to assign as reporter
  const fisherman = await User.findOne({ role: 'fisherman' });
  if (!fisherman) {
    console.error('❌ Please seed users first to ensure a fisherman is available.');
    process.exit(1);
  }

  const fid = fisherman._id;
  const seedZones = [
    {
      fishermanId: fid,
      location: { lat: 8.401, lng: 76.985 },
      species: 'Mackerel',
      abundance: 'high',
      notes: 'Heavy school of Mackerels noticed. Caught 45kg in 2 hours using gill nets.',
    },
    {
      fishermanId: fid,
      location: { lat: 8.368, lng: 76.962 },
      species: 'Sardine',
      abundance: 'high',
      notes: 'Sardines are highly active here. Smooth currents.',
    },
    {
      fishermanId: fid,
      location: { lat: 13.048, lng: 80.312 },
      species: 'Pomfret',
      abundance: 'medium',
      notes: 'Pomfrets spotted in good quantities. Sea condition moderate.',
    },
    {
      fishermanId: fid,
      location: { lat: 10.725, lng: 79.915 },
      species: 'Tuna',
      abundance: 'medium',
      notes: 'Reported Tuna activity. Best to fish early morning.',
    },
    {
      fishermanId: fid,
      location: { lat: 8.042, lng: 77.585 },
      species: 'Seer Fish',
      abundance: 'high',
      notes: 'Seer fish abundant. Strong current warnings active near the southern edge.',
    },
  ];

  // Clear existing zones
  await FishingZone.deleteMany({});
  console.log('🗑️  Cleared existing fishing zones.');

  // Create new zones
  const created = await FishingZone.create(seedZones);
  console.log(`✅ Successfully seeded ${created.length} crowd-sourced fishing zone recommendations!`);

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
