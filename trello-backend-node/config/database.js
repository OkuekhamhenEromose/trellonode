const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trello-clone');
    console.log('‚úÖ MongoDB Connected Successfully');
  } catch (error) {
    console.error('‚ùå MongoDB Connection Error:', error.message);
    console.log('\nÌ≤° Troubleshooting:');
    console.log('1. Is MongoDB service running?');
    console.log('   Open Command Prompt as Administrator and run:');
    console.log('   net start MongoDB');
    console.log('2. Check MongoDB service status:');
    console.log('   net start | findstr MongoDB');
    process.exit(1);
  }
};

module.exports = connectDB;
