const mongoose = require('mongoose');

console.log('Ì∑™ Testing MongoDB connection for Trello backend...');

// For newer mongoose versions, use simpler connection
mongoose.connect('mongodb://127.0.0.1:27017/trello-clone')
.then(() => {
  console.log('‚úÖ SUCCESS: MongoDB is ready!');
  console.log('   Database: trello-clone');
  console.log('   Port: 27017');
  console.log('   Host: 127.0.0.1');
  
  mongoose.disconnect();
  process.exit(0);
})
.catch(err => {
  console.error('‚ùå ERROR: Cannot connect to MongoDB');
  console.error('   Message:', err.message);
  console.log('\nÌ¥ß To fix:');
  console.log('   1. Open Command Prompt as Administrator');
  console.log('   2. Run: net start MongoDB');
  console.log('   3. Try again');
  process.exit(1);
});
