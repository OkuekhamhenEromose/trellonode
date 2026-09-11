const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length && isProduction) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const parseList = (value, fallback = []) =>
  (value || fallback.join(','))
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port number');
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  port,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trello-clone',
  jwtSecret: process.env.JWT_SECRET,
  frontendOrigins: parseList(process.env.CORS_ORIGINS || process.env.FRONTEND_URL, [
    'http://localhost:3000',
    'http://localhost:3001',
  ]),
  backendUrl: process.env.BACKEND_URL || `http://localhost:${port}`,
  socketCorsOrigins: parseList(process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGINS || process.env.FRONTEND_URL, [
    'http://localhost:3000',
    'http://localhost:3001',
  ]),
  maxFileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024),
};
