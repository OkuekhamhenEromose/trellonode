const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trello-clone', {
      // Production-ready options
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your MongoDB Atlas connection string');
    console.log('2. Verify network access is enabled (0.0.0.0/0 for development)');
    console.log('3. Ensure username and password are correct');
    console.log('4. Check if cluster is active');
    process.exit(1);
  }
};

module.exports = connectDB;