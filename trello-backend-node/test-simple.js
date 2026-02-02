const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');

mongoose.connect('mongodb://127.0.0.1:27017/trello-clone')
.then(() => {
  console.log('✅ Connected!');
  console.log('Mongoose version:', mongoose.version);
  mongoose.disconnect();
})
.catch(err => {
  console.error('❌ Failed:', err.message);
});
