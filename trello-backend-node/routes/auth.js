const express = require('express');
const router = express.Router();

// FIRST import all dependencies
const authController = require('../controllers/authController');
const { 
  validateRegistration, 
  validateLogin, 
  validate 
} = require('../validators/authValidators');
const { 
  validateLoginEmail,
  validateLoginPassword,
  validateLoginToken,
  validatePasswordReset
} = require('../middleware/validation');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');

console.log('🚀🚀🚀 AUTH.JS IS BEING EXECUTED 🚀🚀🚀');
console.log('🟢 Auth router loading with all imports');

// DEBUG: Check all middleware
console.log('\n🔍 DEBUG: Checking middleware:');
console.log('  authController.startRegistration:', typeof authController.startRegistration);
console.log('  authController.verifyEmail:', typeof authController.verifyEmail);
console.log('  authController.completeRegistration:', typeof authController.completeRegistration);
console.log('  authController.loginEmail:', typeof authController.loginEmail);
console.log('  authController.loginPassword:', typeof authController.loginPassword);
console.log('  authController.loginVerifyToken:', typeof authController.loginVerifyToken);
console.log('  authController.refreshToken:', typeof authController.refreshToken);
console.log('  authController.googleAuth:', typeof authController.googleAuth);
console.log('  authController.googleCallback:', typeof authController.googleCallback);
console.log('  authController.forgotPassword:', typeof authController.forgotPassword);
console.log('  authController.resetPassword:', typeof authController.resetPassword);
console.log('  authController.login:', typeof authController.login);
console.log('  authController.logout:', typeof authController.logout);
console.log('  authController.getProfile:', typeof authController.getProfile);
console.log('  authController.updateProfile:', typeof authController.updateProfile);
console.log('  authController.checkEmail:', typeof authController.checkEmail);

console.log('\n🔍 DEBUG: Checking validators:');
console.log('  validateRegistration:', typeof validateRegistration);
console.log('  validateLogin:', typeof validateLogin);
console.log('  validate:', typeof validate);
console.log('  validateLoginEmail:', typeof validateLoginEmail);
console.log('  validateLoginPassword:', typeof validateLoginPassword);
console.log('  validateLoginToken:', typeof validateLoginToken);
console.log('  validatePasswordReset:', typeof validatePasswordReset);

console.log('\n🔍 DEBUG: Checking rate limiters:');
console.log('  authLimiter:', typeof authLimiter);
console.log('  passwordResetLimiter:', typeof passwordResetLimiter);

console.log('\n🔍 DEBUG: Checking auth middleware:');
console.log('  auth:', typeof auth);

// ==================== TEST ENDPOINTS ====================
router.get('/test', (req, res) => {
  res.json({ message: 'Auth router is working' });
});

router.get('/test-ping', (req, res) => {
  console.log('🏓 Test ping called');
  res.json({ message: 'pong' });
});

router.post('/test-echo', (req, res) => {
  console.log('📢 Test echo called');
  console.log('Body:', req.body);
  res.json({ received: req.body });
});

// ==================== REGISTRATION FLOW ====================

// Start registration - sends verification email
if (typeof authController.startRegistration === 'function') {
  router.post('/register/start', authController.startRegistration);
  console.log('✅ Registered /register/start');
} else {
  console.error('❌ authController.startRegistration is not a function');
}

// Verify email with token
if (typeof authController.verifyEmail === 'function') {
  router.post('/register/verify', authController.verifyEmail);
  console.log('✅ Registered /register/verify');
} else {
  console.error('❌ authController.verifyEmail is not a function');
}

// Complete registration with password
if (Array.isArray(validateRegistration) && typeof validate === 'function' && typeof authController.completeRegistration === 'function') {
  router.post('/register/complete', validateRegistration, validate, authController.completeRegistration);
  console.log('✅ Registered /register/complete');
} else {
  console.error('❌ Missing dependencies for /register/complete');
}

// ==================== MULTI-STEP LOGIN FLOW ====================

// Step 1: Email verification
if (typeof authLimiter === 'function' && Array.isArray(validateLoginEmail) && typeof authController.loginEmail === 'function') {
  router.post('/login/email', authLimiter, validateLoginEmail, authController.loginEmail);
  console.log('✅ Registered /login/email');
} else {
  console.error('❌ Missing dependencies for /login/email');
}

// Step 2: Password authentication
if (typeof authLimiter === 'function' && Array.isArray(validateLoginPassword) && typeof authController.loginPassword === 'function') {
  router.post('/login/password', authLimiter, validateLoginPassword, authController.loginPassword);
  console.log('✅ Registered /login/password');
} else {
  console.error('❌ Missing dependencies for /login/password');
}

// Step 3: Token verification
if (typeof authLimiter === 'function' && Array.isArray(validateLoginToken) && typeof authController.loginVerifyToken === 'function') {
  router.post('/login/verify-token', authLimiter, validateLoginToken, authController.loginVerifyToken);
  console.log('✅ Registered /login/verify-token');
} else {
  console.error('❌ Missing dependencies for /login/verify-token');
}

// ==================== TOKEN MANAGEMENT ====================
if (typeof authController.refreshToken === 'function') {
  router.post('/refresh-token', authController.refreshToken);
  console.log('✅ Registered /refresh-token');
} else {
  console.error('❌ authController.refreshToken is not a function');
}

// ==================== GOOGLE OAUTH ====================
if (typeof authController.googleAuth === 'function') {
  router.get('/google', authController.googleAuth);
  console.log('✅ Registered /google');
} else {
  console.error('❌ authController.googleAuth is not a function');
}

if (typeof authController.googleCallback === 'function') {
  router.get('/google/callback', authController.googleCallback);
  console.log('✅ Registered /google/callback');
} else {
  console.error('❌ authController.googleCallback is not a function');
}

// ==================== PASSWORD MANAGEMENT ====================
if (typeof passwordResetLimiter === 'function' && Array.isArray(validateLoginEmail) && typeof authController.forgotPassword === 'function') {
  router.post('/forgot-password', passwordResetLimiter, validateLoginEmail, authController.forgotPassword);
  console.log('✅ Registered /forgot-password');
} else {
  console.error('❌ Missing dependencies for /forgot-password');
}

if (typeof passwordResetLimiter === 'function' && Array.isArray(validatePasswordReset) && typeof authController.resetPassword === 'function') {
  router.post('/reset-password', passwordResetLimiter, validatePasswordReset, authController.resetPassword);
  console.log('✅ Registered /reset-password');
} else {
  console.error('❌ Missing dependencies for /reset-password');
}

// ==================== EXISTING AUTH ROUTES ====================
if (Array.isArray(validateLogin) && typeof validate === 'function' && typeof authController.login === 'function') {
  router.post('/login', validateLogin, validate, authController.login);
  console.log('✅ Registered /login');
} else {
  console.error('❌ Missing dependencies for /login');
}

if (typeof auth === 'function' && typeof authController.logout === 'function') {
  router.post('/logout', auth, authController.logout);
  console.log('✅ Registered /logout');
} else {
  console.error('❌ Missing dependencies for /logout');
}

// Add after the existing logout route
if (typeof auth === 'function' && typeof authController.logoutAll === 'function') {
  router.post('/logout-all', auth, authController.logoutAll);
  console.log('✅ Registered /logout-all');
} else {
  console.error('❌ Missing dependencies for /logout-all');
}

// ==================== PROFILE MANAGEMENT ====================
if (typeof auth === 'function' && typeof authController.getProfile === 'function') {
  router.get('/profile', auth, authController.getProfile);
  console.log('✅ Registered /profile');
} else {
  console.error('❌ Missing dependencies for /profile');
}

if (typeof auth === 'function' && typeof authController.updateProfile === 'function') {
  router.put('/profile', auth, authController.updateProfile);
  console.log('✅ Registered /profile (PUT)');
} else {
  console.error('❌ Missing dependencies for /profile (PUT)');
}

// ==================== EMAIL UTILITIES ====================
if (typeof authController.checkEmail === 'function') {
  router.post('/check-email', authController.checkEmail);
  console.log('✅ Registered /check-email');
} else {
  console.error('❌ authController.checkEmail is not a function');
}

console.log('\n✅ Auth router initialization complete');
module.exports = router;