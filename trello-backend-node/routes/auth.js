const express = require('express');
const router = express.Router();
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

// ==================== TEST ENDPOINT ====================

router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth API is working',
    version: '1.0.0'
  });
});

// ==================== MULTI-STEP LOGIN FLOW ====================

// Step 1: Email verification
router.post('/login/email',
  authLimiter,
  validateLoginEmail,
  authController.loginEmail
);

// Step 2: Password authentication
router.post('/login/password',
  authLimiter,
  validateLoginPassword,
  authController.loginPassword
);

// Step 3: Token verification
router.post('/login/verify-token',
  authLimiter,
  validateLoginToken,
  authController.loginVerifyToken
);

// ==================== TOKEN MANAGEMENT ====================

router.post('/refresh-token',
  authController.refreshToken
);

// ==================== EXISTING REGISTRATION FLOW ====================

router.post('/register/start',
  // authLimiter,
  authController.startRegistration
);
router.get('/test-ping', (req, res) => {
  console.log('🏓 Test ping called');
  res.json({ message: 'pong' });
});

router.post('/test-echo', (req, res) => {
  console.log('📢 Test echo called');
  console.log('Body:', req.body);
  res.json({ received: req.body });
});

router.post('/register/verify',
  authLimiter,
  authController.verifyEmail
);

router.post('/register/complete',
  authLimiter,
  validateRegistration,
  validate,
  authController.completeRegistration
);

// ==================== GOOGLE OAUTH ====================

router.get('/google',
  authController.googleAuth
);

router.get('/google/callback',
  authController.googleCallback
);

// ==================== PASSWORD MANAGEMENT ====================

router.post('/forgot-password',
  passwordResetLimiter,
  validateLoginEmail,
  authController.forgotPassword
);

router.post('/reset-password',
  passwordResetLimiter,
  validatePasswordReset,
  authController.resetPassword
);

// ==================== EXISTING AUTH ROUTES ====================

router.post('/login',
  validateLogin,
  validate,
  authController.login
);

router.post('/logout',
  auth,
  authController.logout
);

// ==================== PROFILE MANAGEMENT ====================

router.get('/profile',
  auth,
  authController.getProfile
);

router.put('/profile',
  auth,
  authController.updateProfile
);

// ==================== EMAIL UTILITIES ====================

router.post('/check-email',
  authController.checkEmail
);

module.exports = router;