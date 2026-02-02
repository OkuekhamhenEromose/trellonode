const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { 
  validateRegistration, 
  validateLogin, 
  validate 
} = require('../validators/authValidators');
const auth = require('../middleware/auth');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth API is working',
    version: '1.0.0'
  });
});

// Registration flow
router.post('/register/start', 
  authController.startRegistration
);

router.post('/register/verify', 
  authController.verifyEmail
);

router.post('/register/complete', 
  validateRegistration,
  validate,
  authController.completeRegistration
);

// Login
router.post('/login', 
  validateLogin,
  validate,
  authController.login
);

// Logout
router.post('/logout', 
  auth, 
  authController.logout
);

// Profile
router.get('/profile', 
  auth, 
  authController.getProfile
);

router.put('/profile', 
  auth, 
  authController.updateProfile
);

// Check email availability
router.post('/check-email', 
  authController.checkEmail
);

module.exports = router;