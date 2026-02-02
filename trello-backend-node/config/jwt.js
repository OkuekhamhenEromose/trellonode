module.exports = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  accessExpiration: '1d',
  refreshExpiration: '7d',
};