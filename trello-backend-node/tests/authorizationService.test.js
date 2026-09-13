// These tests exercise the authorization service in isolation. MongoDB itself is mocked,
// so failures here point to authorization logic rather than database connectivity.
const mongoose = require('mongoose');
jest.mock('../models/Board', () => ({ findById: jest.fn() }));
jest.mock('../models/List', () => ({ findById: jest.fn() }));
jest.mock('../models/Card', () => ({ findById: jest.fn() }));
const Board = require('../models/Board');
const authorization = require('../services/authorizationService');

describe('authorizationService', () => {
  const ownerId = new mongoose.Types.ObjectId();
  const memberId = new mongoose.Types.ObjectId();
  const outsiderId = new mongoose.Types.ObjectId();
  const boardId = new mongoose.Types.ObjectId();
  const makeBoard = () => ({ _id: boardId, owner: ownerId, members: [ownerId, memberId] });
  // Reset mocks between tests so one scenario cannot leak state into another.
  beforeEach(() => jest.clearAllMocks());

  // Owner access: ownership implies board membership.
  test('owner has member and owner access', async () => {
    Board.findById.mockResolvedValue(makeBoard());
    await expect(authorization.requireBoardMember(boardId, ownerId)).resolves.toMatchObject({ isOwner: true, isMember: true, role: 'owner' });
  });
  // Ordinary member access: membership is valid, but owner-only permissions are not.
  test('member has member but not owner access', async () => {
    Board.findById.mockResolvedValue(makeBoard());
    await expect(authorization.requireBoardMember(boardId, memberId)).resolves.toMatchObject({ isOwner: false, isMember: true, role: 'member' });
  });
  // IDOR defense: knowing the board ID is insufficient without membership.
  test('outsider is denied board access', async () => {
    Board.findById.mockResolvedValue(makeBoard());
    await expect(authorization.requireBoardMember(boardId, outsiderId)).rejects.toMatchObject({ status: 403, code: 'BOARD_ACCESS_DENIED' });
  });
  // Role boundary: a member must be rejected by owner-only authorization.
  test('member cannot perform owner-only action', async () => {
    Board.findById.mockResolvedValue(makeBoard());
    await expect(authorization.requireBoardOwner(boardId, memberId)).rejects.toMatchObject({ status: 403, code: 'BOARD_OWNER_REQUIRED' });
  });
  // Resource existence is distinct from permission denial: missing board => 404.
  test('missing board is reported as not found', async () => {
    Board.findById.mockResolvedValue(null);
    await expect(authorization.requireBoardMember(boardId, ownerId)).rejects.toMatchObject({ status: 404, code: 'BOARD_NOT_FOUND' });
  });
});
