process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough';
process.env.JWT_ISSUER = 'trello-backend';
process.env.JWT_AUDIENCE = 'trello-web';

const jwt = require('jsonwebtoken');

jest.mock('../models/User', () => ({
  findById: jest.fn(),
}));

const User = require('../models/User');
const auth = require('../middleware/auth');
const { secret, issuer, audience } = require('../config/jwt');

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('authentication middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a request without an access token', async () => {
    const req = { get: jest.fn().mockReturnValue(undefined) };
    const res = createResponse();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'AUTH_TOKEN_MISSING' }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a valid JWT that is not an access token', async () => {
    const token = jwt.sign(
      { userId: '507f1f77bcf86cd799439011', type: 'refresh' },
      secret,
      { expiresIn: '5m', issuer, audience },
    );
    const req = { get: jest.fn().mockReturnValue(`Bearer ${token}`) };
    const res = createResponse();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches an active user for a valid access token', async () => {
    const user = { _id: '507f1f77bcf86cd799439011', isActive: true };
    User.findById.mockResolvedValue(user);

    const token = jwt.sign(
      { userId: user._id, type: 'access' },
      secret,
      { expiresIn: '5m', issuer, audience },
    );
    const req = { get: jest.fn().mockReturnValue(`Bearer ${token}`) };
    const res = createResponse();
    const next = jest.fn();

    await auth(req, res, next);

    expect(req.user).toBe(user);
    expect(req.token).toBe(token);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
