process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough';
process.env.JWT_ISSUER = 'trello-backend';
process.env.JWT_AUDIENCE = 'trello-web';

const jwt = require('jsonwebtoken');

jest.mock('../models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../services/authorizationService', () => ({
  requireBoardMember: jest.fn(),
}));

const User = require('../models/User');
const authorizationService = require('../services/authorizationService');
const { secret, issuer, audience } = require('../config/jwt');
const {
  authenticateSocket,
  authorizeBoardJoin,
} = require('../services/socketAuthorizationService');

const userId = '507f1f77bcf86cd799439011';
const boardId = '507f1f77bcf86cd799439012';

const createSocket = (token) => ({
  handshake: { auth: token ? { token } : {} },
  join: jest.fn().mockResolvedValue(undefined),
});

const createToken = (payload = { userId, type: 'access' }, options = {}) =>
  jwt.sign(payload, secret, {
    expiresIn: '5m',
    issuer,
    audience,
    ...options,
  });

describe('Socket.IO authentication and authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a socket without an access token', async () => {
    const socket = createSocket();
    const next = jest.fn();

    await authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Authentication required');
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('rejects a refresh token presented as a socket access token', async () => {
    const token = createToken({ userId, type: 'refresh' });
    const socket = createSocket(token);
    const next = jest.fn();

    await authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Invalid authentication token');
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('rejects an expired access token', async () => {
    const token = createToken({ userId, type: 'access' }, { expiresIn: -1 });
    const socket = createSocket(token);
    const next = jest.fn();

    await authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Token expired');
  });

  test('accepts a valid access token for an active user', async () => {
    const user = { _id: userId, isActive: true };
    User.findById.mockResolvedValue(user);
    const token = createToken();
    const socket = createSocket(token);
    const next = jest.fn();

    await authenticateSocket(socket, next);

    expect(User.findById).toHaveBeenCalledWith(userId);
    expect(socket.user).toBe(user);
    expect(socket.userId).toBe(userId);
    expect(socket.accessToken).toBe(token);
    expect(next).toHaveBeenCalledWith();
  });

  test('allows an authenticated board member to join the board room', async () => {
    const socket = { user: { _id: userId }, join: jest.fn().mockResolvedValue(undefined) };
    const board = { _id: boardId };
    authorizationService.requireBoardMember.mockResolvedValue({
      board,
      userId,
      isOwner: false,
      isMember: true,
      role: 'member',
    });

    const result = await authorizeBoardJoin(socket, boardId);

    expect(authorizationService.requireBoardMember).toHaveBeenCalledWith(boardId, userId);
    expect(socket.join).toHaveBeenCalledWith(`board:${boardId}`);
    expect(result.isMember).toBe(true);
  });

  test('rejects a non-member before joining a board room', async () => {
    const socket = { user: { _id: userId }, join: jest.fn() };
    const error = Object.assign(new Error('Board access denied'), {
      status: 403,
      code: 'BOARD_ACCESS_DENIED',
    });
    authorizationService.requireBoardMember.mockRejectedValue(error);

    await expect(authorizeBoardJoin(socket, boardId)).rejects.toMatchObject({
      status: 403,
      code: 'BOARD_ACCESS_DENIED',
    });

    expect(socket.join).not.toHaveBeenCalled();
  });

  test('rejects an invalid board ID before querying authorization', async () => {
    const socket = { user: { _id: userId }, join: jest.fn() };

    await expect(authorizeBoardJoin(socket, 'not-a-board-id')).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_ID',
    });

    expect(authorizationService.requireBoardMember).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
  });
});
