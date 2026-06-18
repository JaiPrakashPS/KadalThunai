/**
 * Seed script to populate fishing zones around the Indian coastline.
 * Run: node scripts/seedFishingZones.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const FishingZone = require('../src/models/FishingZone');
const { mongoUri } = require('../src/config/env');

const seedZones = [
  {
    name: 'Chennai Offshore Fishing Zone',
    nameTamil: 'சென்னை கடற்கரை மீன்பிடி மண்டலம்',
    safetyLevel: 'safe',
    description: 'Excellent fish density reported. High presence of Pomfret and Mackerel. Smooth sea states.',
    descriptionTamil: 'சிறந்த மீன் அடர்த்தி பதிவாகியுள்ளது. வாவல் மற்றும் அயலை மீன்களின் இருப்பு அதிகமாக உள்ளது. அமைதியான கடல் அலைகள்.',
    recommendedSpecies: ['Pomfret', 'Mackerel', 'Seer Fish'],
    bestSeasons: ['January', 'February', 'March', 'October', 'November', 'December'],
    depthRangeMeters: { min: 30, max: 70 },
    distanceFromShoreKm: 15,
    coordinates: [
      { lat: 13.08, lng: 80.30 },
      { lat: 13.12, lng: 80.35 },
      { lat: 13.05, lng: 80.40 },
      { lat: 13.02, lng: 80.32 }
    ],
    centerPoint: { lat: 13.067, lng: 80.342 }
  },
  {
    name: 'Nagapattinam Fishing Harbour Zone',
    nameTamil: 'நாகப்பட்டினம் மீன்பிடி துறைமுக மண்டலம்',
    safetyLevel: 'safe',
    description: 'Active fishing area. Good catches of Sardine and Prawn. Check daily local harbour notices.',
    descriptionTamil: 'செயலில் உள்ள மீன்பிடி பகுதி. மத்தி மற்றும் இறால் நல்ல அளவில் கிடைக்கும். தினசரி துறைமுக அறிவிப்புகளைப் பார்க்கவும்.',
    recommendedSpecies: ['Sardine', 'Prawn', 'Mackerel'],
    bestSeasons: ['January', 'February', 'March', 'April', 'September', 'October', 'November', 'December'],
    depthRangeMeters: { min: 25, max: 60 },
    distanceFromShoreKm: 12,
    coordinates: [
      { lat: 10.74, lng: 79.86 },
      { lat: 10.78, lng: 79.92 },
      { lat: 10.71, lng: 79.95 },
      { lat: 10.67, lng: 79.88 }
    ],
    centerPoint: { lat: 10.725, lng: 79.902 }
  },
  {
    name: 'Kanyakumari Ocean Confluence',
    nameTamil: 'கன்னியாகுமரி முக்கடல் சங்கம பகுதி',
    safetyLevel: 'caution',
    description: 'Strong undercurrents at the confluence of three oceans. Swells up to 2.5m. Proceed with caution.',
    descriptionTamil: 'முக்கடல் சங்கமிக்கும் பகுதியில் வலுவான அலை நீரோட்டங்கள் உள்ளன. 2.5 மீட்டர் வரை அலைகள் எழும். எச்சரிக்கையுடன் செல்லவும்.',
    recommendedSpecies: ['Tuna', 'Seer Fish'],
    bestSeasons: ['January', 'February', 'November', 'December'],
    depthRangeMeters: { min: 50, max: 120 },
    distanceFromShoreKm: 20,
    coordinates: [
      { lat: 8.05, lng: 77.52 },
      { lat: 8.09, lng: 77.60 },
      { lat: 8.01, lng: 77.63 },
      { lat: 7.97, lng: 77.55 }
    ],
    centerPoint: { lat: 8.03, lng: 77.575 }
  },
  {
    name: 'Palk Strait Protection Line',
    nameTamil: 'பாக் ஜலசந்தி பாதுகாப்பு எல்லை',
    safetyLevel: 'restricted',
    description: 'International Maritime Boundary Line (IMBL) buffer zone. Border security patrolling active. Crossing prohibited.',
    descriptionTamil: 'சர்வதேச கடல் எல்லைக் கோடு (IMBL) பகுதி. எல்லை பாதுகாப்பு ரோந்துப் பணி தீவிரமாக உள்ளது. எல்லை தாண்டி செல்ல அனுமதி இல்லை.',
    recommendedSpecies: [],
    bestSeasons: [],
    depthRangeMeters: { min: 10, max: 30 },
    distanceFromShoreKm: 8,
    coordinates: [
      { lat: 9.35, lng: 79.25 },
      { lat: 9.40, lng: 79.35 },
      { lat: 9.25, lng: 79.40 },
      { lat: 9.20, lng: 79.30 }
    ],
    centerPoint: { lat: 9.30, lng: 79.325 }
  },
  {
    name: 'Kochi Offshore Zone, Kerala',
    nameTamil: 'கொச்சி கடல் மீன்பிடி மண்டலம் - கேரளா',
    safetyLevel: 'safe',
    description: 'Sardine season is at its peak. Calm sea conditions. Recommended for all vessel types.',
    descriptionTamil: 'மத்தி மீன் சீசன் உச்சத்தில் உள்ளது. அமைதியான கடல் சூழல். அனைத்து வகையான படகுகளுக்கும் பரிந்துரைக்கப்படுகிறது.',
    recommendedSpecies: ['Sardine', 'Mackerel'],
    bestSeasons: ['June', 'July', 'August', 'September', 'October'],
    depthRangeMeters: { min: 40, max: 90 },
    distanceFromShoreKm: 18,
    coordinates: [
      { lat: 9.93, lng: 76.15 },
      { lat: 9.98, lng: 76.22 },
      { lat: 9.90, lng: 76.26 },
      { lat: 9.85, lng: 76.18 }
    ],
    centerPoint: { lat: 9.915, lng: 76.202 }
  },
  {
    name: 'Mangalore Fishing Zone, Karnataka',
    nameTamil: 'மங்களூர் மீன்பிடி மண்டலம் - கர்நாடகா',
    safetyLevel: 'caution',
    description: 'High wind speeds reported seasonally. Check weather warnings before departure.',
    descriptionTamil: 'பருவகாலங்களில் பலத்த காற்று வீசக்கூடும். கடலுக்குச் செல்லும் முன் வானிலை எச்சரிக்கைகளை சரிபார்க்கவும்.',
    recommendedSpecies: ['Squid', 'Pomfret'],
    bestSeasons: ['September', 'October', 'November', 'December'],
    depthRangeMeters: { min: 45, max: 110 },
    distanceFromShoreKm: 22,
    coordinates: [
      { lat: 12.82, lng: 74.72 },
      { lat: 12.87, lng: 74.79 },
      { lat: 12.79, lng: 74.83 },
      { lat: 12.74, lng: 74.75 }
    ],
    centerPoint: { lat: 12.805, lng: 74.772 }
  },
  {
    name: 'Mumbai Offshore Fishing Area',
    nameTamil: 'மும்பை கடல் மீன்பிடி பகுதி',
    safetyLevel: 'safe',
    description: 'Good wind speed. Large schools of Pomfret and Bombay Duck detected. Normal sea states.',
    descriptionTamil: 'சாதகமான காற்று வேகம். வாவல் மீன்கள் பெருமளவில் கண்டறியப்பட்டுள்ளன. சாதாரண கடல் அலைகள்.',
    recommendedSpecies: ['Pomfret', 'Squid'],
    bestSeasons: ['October', 'November', 'December', 'January', 'February'],
    depthRangeMeters: { min: 50, max: 95 },
    distanceFromShoreKm: 25,
    coordinates: [
      { lat: 18.90, lng: 72.65 },
      { lat: 18.96, lng: 72.75 },
      { lat: 18.85, lng: 72.80 },
      { lat: 18.80, lng: 72.68 }
    ],
    centerPoint: { lat: 18.877, lng: 72.72 }
  },
  {
    name: 'Visakhapatnam Deep Sea Area',
    nameTamil: 'விசாகப்பட்டினம் ஆழ்கடல் பகுதி',
    safetyLevel: 'caution',
    description: 'Deep water zone with high wave heights. Recommended for large motorized or mechanized vessels only.',
    descriptionTamil: 'ஆழ்கடல் பகுதி. அதிக அலை உயரம். பெரிய விசைப்படகுகள் மற்றும் இயந்திரப் படகுகளுக்கு மட்டுமே பரிந்துரைக்கப்படுகிறது.',
    recommendedSpecies: ['Tuna', 'Seer Fish'],
    bestSeasons: ['October', 'November', 'December', 'January'],
    depthRangeMeters: { min: 100, max: 250 },
    distanceFromShoreKm: 35,
    coordinates: [
      { lat: 17.65, lng: 83.35 },
      { lat: 17.72, lng: 83.45 },
      { lat: 17.60, lng: 83.50 },
      { lat: 17.53, lng: 83.38 }
    ],
    centerPoint: { lat: 17.625, lng: 83.42 }
  },
  {
    name: 'Paradip Coastal Fishing Zone, Odisha',
    nameTamil: 'பாராதீப் மீன்பிடி மண்டலம் - ஒடிசா',
    safetyLevel: 'safe',
    description: 'Excellent water temperature and chlorophyll concentrations. Rich in Prawn and Hilsa.',
    descriptionTamil: 'சிறந்த கடல் வெப்பநிலை மற்றும் குளோரோபில் செறிவு. இறால் மற்றும் ஹில்சா மீன்கள் அதிகமாகக் கிடைக்கின்றன.',
    recommendedSpecies: ['Prawn', 'Sardine'],
    bestSeasons: ['August', 'September', 'October', 'November'],
    depthRangeMeters: { min: 20, max: 55 },
    distanceFromShoreKm: 14,
    coordinates: [
      { lat: 19.22, lng: 84.95 },
      { lat: 19.28, lng: 85.05 },
      { lat: 19.18, lng: 85.10 },
      { lat: 19.12, lng: 84.98 }
    ],
    centerPoint: { lat: 19.20, lng: 85.02 }
  },
  {
    name: 'Sundarbans Sanctuary Area',
    nameTamil: 'சுந்தரவன காப்பக பகுதி',
    safetyLevel: 'restricted',
    description: 'Protected mangrove biosphere reserve. Marine reserve rules apply. General commercial fishing strictly prohibited.',
    descriptionTamil: 'பாதுகாக்கப்பட்ட அலையாத்திக் காடுகள் காப்பக பகுதி. மீன்பிடித்தல் முற்றிலும் தடைசெய்யப்பட்டுள்ளது.',
    recommendedSpecies: [],
    bestSeasons: [],
    depthRangeMeters: { min: 5, max: 20 },
    distanceFromShoreKm: 5,
    coordinates: [
      { lat: 21.60, lng: 88.60 },
      { lat: 21.68, lng: 88.75 },
      { lat: 21.55, lng: 88.80 },
      { lat: 21.48, lng: 88.65 }
    ],
    centerPoint: { lat: 21.577, lng: 88.70 }
  }
];

const seed = async () => {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB...');

  // Clear existing zones
  await FishingZone.deleteMany({});
  console.log('🗑️  Cleared existing fishing zones.');

  // Create new zones
  const created = await FishingZone.create(seedZones);
  console.log(`✅ Successfully seeded ${created.length} fishing zones across India!`);

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
