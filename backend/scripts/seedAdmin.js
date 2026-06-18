/**
 * Seed script to create an initial admin user.
 * Run: node scripts/seedAdmin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { mongoUri } = require('../src/config/env');

const seed = async () => {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB...');

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log(`✅ Admin already exists: ${existing.email}`);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'KadalThunai Admin',
    email: 'admin@kadalthunai.gov.in',
    passwordHash: 'Admin@1234',
    phone: '9999999999',
    role: 'admin',
    isActive: true,
    isVerified: true,
  });

  console.log('✅ Admin user created!');
  console.log(`   Email    : ${admin.email}`);
  console.log(`   Password : Admin@1234`);
  console.log(`   ⚠️  Change the password after first login!`);

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
