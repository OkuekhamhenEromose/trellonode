const config = require('./env');

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is required. Refusing to start without a JWT secret.');
}

module.exports = {
  secret: config.jwtSecret,
  accessExpiration: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '1d',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};
