const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many password reset attempts, please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  apiLimiter
};


// const rateLimit = require('express-rate-limit');

// // Simple in-memory rate limiter (works for development)
// const createLimiter = (windowMs, max, message) => rateLimit({
//   windowMs,
//   max,
//   message: { error: message },
//   standardHeaders: true,
//   legacyHeaders: false,
//   // Skip failed requests to avoid counting errors
//   skipSuccessfulRequests: true
// });

// const authLimiter = createLimiter(
//   15 * 60 * 1000, // 15 minutes
//   5,
//   'Too many login attempts, please try again later.'
// );

// const passwordResetLimiter = createLimiter(
//   60 * 60 * 1000, // 1 hour
//   3,
//   'Too many password reset attempts, please try again later.'
// );

// const apiLimiter = createLimiter(
//   15 * 60 * 1000, // 15 minutes
//   100,
//   'Too many requests, please try again later.'
// );

// module.exports = {
//   authLimiter,
//   passwordResetLimiter,
//   apiLimiter
// };