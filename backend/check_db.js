const mongoose = require('mongoose');
const env = require('./src/config/env');
const GovernmentScheme = require('./src/models/GovernmentScheme');

async function check() {
  try {
    await mongoose.connect(env.mongoUri || 'mongodb://localhost:27017/kadal_thunai');
    console.log('Connected to MongoDB');
    
    const schemes = await GovernmentScheme.find({});
    console.log('SCHEMES IN DB:', JSON.stringify(schemes, null, 2));
    
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

check();
