const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Common validation rules
exports.validateEmail = body('email')
  .isEmail()
  .withMessage('Please enter a valid email address')
  .normalizeEmail();

exports.validatePassword = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long')
  .matches(/\d/)
  .withMessage('Password must contain at least one number')
  .matches(/[a-zA-Z]/)
  .withMessage('Password must contain at least one letter');

exports.validateUsername = body('username')
  .isLength({ min: 3, max: 30 })
  .withMessage('Username must be between 3 and 30 characters')
  .matches(/^[a-zA-Z0-9_]+$/)
  .withMessage('Username can only contain letters, numbers, and underscores');

// Registration validation
exports.validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .custom(async (email) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email is already registered');
      }
      return true;
    }),
  
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom(async (username) => {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error('Username is already taken');
      }
      return true;
    }),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('password2')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  body('fullname')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
];

// Login validation - ADD THIS
exports.validateLogin = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('username')
    .optional()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.username) {
      throw new Error('Either email or username is required');
    }
    return true;
  })
];

// Validation result handler - ADD THIS
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Board validation (keep your existing board validations if needed)
exports.validateBoard = [
  body('title')
    .notEmpty()
    .withMessage('Board title is required')
    .isLength({ max: 255 })
    .withMessage('Board title cannot exceed 255 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('background_color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Background color must be a valid hex color (e.g., #0079BF)'),
  
  body('member_ids')
    .optional()
    .isArray()
    .withMessage('Member IDs must be an array')
];

// List validation
exports.validateList = [
  body('title')
    .notEmpty()
    .withMessage('List title is required')
    .isLength({ max: 255 })
    .withMessage('List title cannot exceed 255 characters'),
  
  body('board')
    .notEmpty()
    .withMessage('Board ID is required')
    .isMongoId()
    .withMessage('Invalid board ID'),
  
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a positive integer')
];

// Card validation
exports.validateCard = [
  body('title')
    .notEmpty()
    .withMessage('Card title is required')
    .isLength({ max: 255 })
    .withMessage('Card title cannot exceed 255 characters'),
  
  body('list')
    .notEmpty()
    .withMessage('List ID is required')
    .isMongoId()
    .withMessage('Invalid list ID'),
  
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a positive integer'),
  
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array'),
  
  body('member_ids')
    .optional()
    .isArray()
    .withMessage('Member IDs must be an array')
];

// Comment validation
exports.validateComment = [
  body('text')
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ max: 2000 })
    .withMessage('Comment cannot exceed 2000 characters'),
  
  body('card')
    .notEmpty()
    .withMessage('Card ID is required')
    .isMongoId()
    .withMessage('Invalid card ID')
];

// Checklist validation
exports.validateChecklist = [
  body('title')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Checklist title cannot exceed 255 characters'),
  
  body('card')
    .notEmpty()
    .withMessage('Card ID is required')
    .isMongoId()
    .withMessage('Invalid card ID')
];

// Checklist item validation
exports.validateChecklistItem = [
  body('text')
    .notEmpty()
    .withMessage('Item text is required')
    .isLength({ max: 255 })
    .withMessage('Item text cannot exceed 255 characters'),
  
  body('checklist')
    .notEmpty()
    .withMessage('Checklist ID is required')
    .isMongoId()
    .withMessage('Invalid checklist ID'),
  
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a positive integer')
];

// Reorder validation
exports.validateReorderLists = [
  body('lists')
    .isArray({ min: 1 })
    .withMessage('Lists array is required and cannot be empty'),
  
  body('lists.*')
    .isMongoId()
    .withMessage('Invalid list ID')
];

exports.validateReorderCards = [
  body('cards')
    .isArray({ min: 1 })
    .withMessage('Cards array is required and cannot be empty'),
  
  body('cards.*')
    .isMongoId()
    .withMessage('Invalid card ID'),
  
  body('destination_list_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid destination list ID'),
  
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a positive integer')
];