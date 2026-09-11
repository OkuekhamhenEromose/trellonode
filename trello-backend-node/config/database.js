const mongoose = require('mongoose');
const config = require('./env');

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.info('MongoDB reconnected');
  });
};

const connectDB = async () => {
  registerConnectionListeners();

  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not configured');
  }

  const connection = await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: Number(process.env.DB_CONNECTION_TIMEOUT || 10000),
    socketTimeoutMS: Number(process.env.DB_SOCKET_TIMEOUT || 45000),
    maxPoolSize: Number(process.env.DB_POOL_SIZE || 10),
    family: 4,
  });

  console.info(`MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);
  return connection;
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
