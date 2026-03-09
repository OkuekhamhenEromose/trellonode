const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

const validatePassword = body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
  .withMessage('Password must be at least 8 characters and contain at least one letter, one number, and one special character');

const validateLoginEmail = [
  validateEmail,
  handleValidationErrors
];

const validateLoginPassword = [
  validateEmail,
  validatePassword,
  handleValidationErrors
];

const validateLoginToken = [
  validateEmail,
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Token must be a 6-digit number'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('token')
    .isLength({ min: 64, max: 64 })
    .isHexadecimal()
    .withMessage('Invalid reset token'),
  validatePassword,
  handleValidationErrors
];

module.exports = {
  validateLoginEmail,
  validateLoginPassword,
  validateLoginToken,
  validatePasswordReset
};