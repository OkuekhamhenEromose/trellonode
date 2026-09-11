const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const required = ['MONGODB_URI', 'JWT_SECRET']
const missing = required.filter((key) => !process.env[key]);

if (missing.length && isProduction) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

