const config = require('./env');

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is required. Refusing to start without a JWT secret.');
}

module.exports = {
  secret: config.jwtSecret,
  accessExpiration: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  refreshExpiration: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  issuer: process.env.JWT_ISSUER || "trello-backend",
  audience: process.env.JWT_AUDIENCE || "trello-web",
};
