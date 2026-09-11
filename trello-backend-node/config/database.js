const mongoose = require('mongoose');
const config = require('./env')

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
};

const connectDB = async () => {
  registerConnectionListeners();
  if (!config.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Please set it in your environment variables.');
  }

  const connection = await mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: Number(process.env.DB_CONNECTION_TIMEOUT || 10000), // 10 seconds
    socketTimeoutMS: Number(process.env.DB_SOCKET_TIMEOUT || 45000), // 45 seconds
    maxPoolSize: Number(process.env.DB_MAX_POOL_SIZE || 10), // Default is 10
    family: 4, // Use IPv4, set to 6 for IPv6
  });

  console.info(`✅ MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);
  return connection;
}

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.info('✅ MongoDB disconnected');
  }
}

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
