const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Generate JWT token
exports.generateToken = (userId, expiresIn = '1d') => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn }
  );
};

// Verify JWT token
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
};

// Hash password
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
exports.comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate random string
exports.generateRandomString = (length = 6) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

// Generate verification code
exports.generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Format date
exports.formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

// Sanitize object (remove undefined, null, empty strings)
exports.sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Validate email
exports.validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Paginate results
exports.paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {};
  results.total = array.length;
  results.pages = Math.ceil(array.length / limit);
  results.currentPage = page;
  results.limit = limit;
  
  if (endIndex < array.length) {
    results.next = {
      page: page + 1,
      limit: limit
    };
  }
  
  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit: limit
    };
  }
  
  results.results = array.slice(startIndex, endIndex);
  return results;
};

// Generate unique ID
exports.generateUniqueId = () => {
  return uuidv4();
};

// Calculate position for new item
exports.calculatePosition = async (Model, filter) => {
  const maxPosition = await Model.findOne(filter)
    .sort('-position')
    .select('position');
  
  return (maxPosition ? maxPosition.position : -1) + 1;
};

// Validate URL
exports.validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// Truncate string
exports.truncateString = (str, length = 100) => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

// Clone object deeply
exports.deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Sleep function
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};