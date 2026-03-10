const rateLimit = require('express-rate-limit');

// Simple in-memory rate limiter (works for development)
const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip failed requests to avoid counting errors
  skipSuccessfulRequests: true
});

const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  'Too many login attempts, please try again later.'
);

const passwordResetLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  3,
  'Too many password reset attempts, please try again later.'
);

const apiLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests, please try again later.'
);

module.exports = {
  authLimiter,
  passwordResetLimiter,
  apiLimiter
};