// Socket.IO authorization helpers.
//
// Teaching goal: Socket.IO has its own transport lifecycle, but it must reuse the
// same authentication and authorization rules as the REST API. A connected socket
// is not automatically authorized to access every board.
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const authorizationService = require('./authorizationService');
const { secret, issuer, audience } = require('../config/jwt');

// Authenticate the Socket.IO handshake with the same access-token contract used by
// HTTP authentication: signed JWT + issuer/audience + type=access + active user.
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, secret, { issuer, audience });

    if (decoded?.type !== 'access' || !decoded?.userId) {
      return next(new Error('Invalid authentication token'));
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return next(new Error('Authenticated user is inactive'));
    }

    socket.user = user;
    socket.userId = decoded.userId;
    socket.accessToken = token;

    return next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Token expired'
        : 'Authentication failed';

    return next(new Error(message));
  }
};

// Authorize a board-room join through the central authorization service.
// The socket may know a board ID, but that ID never grants access by itself.
const authorizeBoardJoin = async (socket, boardId) => {
  if (!mongoose.isValidObjectId(boardId)) {
    const error = new Error('Invalid board ID');
    error.status = 400;
    error.code = 'INVALID_ID';
    throw error;
  }

  const membership = await authorizationService.requireBoardMember(
    boardId,
    socket.user._id,
  );

  await socket.join(`board:${membership.board._id}`);

  return membership;
};

module.exports = {
  authenticateSocket,
  authorizeBoardJoin,
};
