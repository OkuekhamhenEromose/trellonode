const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { secret, issuer, audience } = require('../config/jwt');

const auth = async (req, res, next) => {
  try {
    const header = req.get('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_TOKEN_MISSING', message: 'Authentication required.' },
      });
    }

    const decoded = jwt.verify(token, secret, { issuer, audience });
    if (decoded?.type !== 'access' || !decoded?.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_TOKEN_INVALID', message: 'Invalid authentication token.' },
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_USER_INACTIVE', message: 'Authenticated user is inactive.' },
      });
    }

    req.user = user;
    req.token = token;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
        message: 'Authentication required.',
      },
    });
  }
};

module.exports = auth;
