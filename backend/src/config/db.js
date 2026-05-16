require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('./env');

mongoose.set('strictQuery', true);

async function connectDb() {
  const uri = mongoUri || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in backend/.env');
  }

  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 10000
  });
}

async function closeDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

module.exports = {
  connectDb,
  closeDb,
  mongoose
};
