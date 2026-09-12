const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const {
  validateRegistration,
  validateLogin,
  validate,
} = require('../validators/authValidators');
const {
  validateLoginEmail,
  validateLoginPassword,
  validateLoginToken,
  validatePasswordReset,
} = require('../middleware/validation');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');

// Registration
router.post('/register/start', authLimiter, validateLoginEmail, authController.startRegistration);
router.post('/register/verify', authLimiter, validateLoginEmail, authController.verifyEmail);
router.post('/register/complete', authLimiter, validateRegistration, validate, authController.completeRegistration);

// Multi-step login
router.post('/login/email', authLimiter, validateLoginEmail, authController.loginEmail);
router.post('/login/password', authLimiter, validateLoginPassword, authController.loginPassword);
router.post('/login/verify-token', authLimiter, validateLoginToken, authController.loginVerifyToken);

// Token lifecycle
router.post('/refresh-token', authController.refreshToken);

// Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.post('/google/login', authController.googleMobileLogin);

// Password management
router.post('/forgot-password', passwordResetLimiter, validateLoginEmail, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validatePasswordReset, authController.resetPassword);

// Legacy direct login — retained for compatibility; new UI should use the multi-step flow.
router.post('/login', authLimiter, validateLogin, validate, authController.login);

// Session management
router.post('/logout', auth, authController.logout);
router.post('/logout-all', auth, authController.logoutAll);

// Profile
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);

// Public email availability check
router.post('/check-email', authLimiter, validateLoginEmail, authController.checkEmail);

module.exports = router;
