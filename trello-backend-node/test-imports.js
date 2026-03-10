console.log('🔍 Testing imports...\n');

try {
  console.log('1. Loading authController...');
  const authController = require('./controllers/authController');
  console.log('   ✅ OK');
  console.log('   Exported functions:', Object.keys(authController));
} catch (err) {
  console.log('   ❌ Error:', err.message);
  console.log(err.stack);
}

console.log('\n-------------------\n');

try {
  console.log('2. Loading authValidators...');
  const validators = require('./validators/authValidators');
  console.log('   ✅ OK');
  console.log('   Exported:', Object.keys(validators));
} catch (err) {
  console.log('   ❌ Error:', err.message);
  console.log(err.stack);
}

console.log('\n-------------------\n');

try {
  console.log('3. Loading validation middleware...');
  const validation = require('./middleware/validation');
  console.log('   ✅ OK');
  console.log('   Exported:', Object.keys(validation));
} catch (err) {
  console.log('   ❌ Error:', err.message);
  console.log(err.stack);
}

console.log('\n-------------------\n');

try {
  console.log('4. Loading rateLimiter...');
  const rateLimiter = require('./middleware/rateLimiter');
  console.log('   ✅ OK');
  console.log('   Exported:', Object.keys(rateLimiter));
} catch (err) {
  console.log('   ❌ Error:', err.message);
  console.log(err.stack);
}

console.log('\n-------------------\n');

try {
  console.log('5. Loading auth middleware...');
  const auth = require('./middleware/auth');
  console.log('   ✅ OK');
  console.log('   Exported:', typeof auth);
} catch (err) {
  console.log('   ❌ Error:', err.message);
  console.log(err.stack);
}

console.log('\n-------------------\n');

try {
  console.log('6. Loading auth routes...');
  const authRoutes = require('./routes/auth');
  console.log('   ✅ OK');
  console.log('   Type:', typeof authRoutes);
  console.log('   Has stack:', !!authRoutes.stack);
} catch (err) {
  console.log('   ❌ Error:', err.message);
  console.log(err.stack);
}