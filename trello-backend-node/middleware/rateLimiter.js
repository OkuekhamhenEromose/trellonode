const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

const createLimiter = (windowMs, max, message) => rateLimit({
  store: new MongoStore({
    uri: process.env.MONGODB_URI,
    collectionName: 'rateLimits'
  }),
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false
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