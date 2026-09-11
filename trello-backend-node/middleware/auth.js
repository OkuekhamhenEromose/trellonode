const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { secret } = require('../config/jwt');

const auth = async (req, res, next) => {
  try {
    const header = req.get('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    const decoded = jwt.verify(token, secret);
    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid authentication token.' },
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authenticated user not found.' },
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }
};

module.exports = auth;
