const express = require('express');
const router = express.Router();

console.log('✅ TEST ROUTER LOADED');

router.get('/test', (req, res) => {
  res.json({ message: 'Test router working' });
});

router.post('/register/start', (req, res) => {
  console.log('✅ Register start hit in test router');
  res.json({ 
    message: 'Verification email sent from test router',
    email: req.body.email
  });
});

module.exports = router;