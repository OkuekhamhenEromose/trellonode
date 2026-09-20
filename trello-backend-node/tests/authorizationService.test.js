// These tests exercise the authorization service in isolation. MongoDB itself is mocked,
// so failures here point to authorization logic rather than database connectivity.
const mongoose = require("mongoose");
jest.mock("../models/Board", () => ({ findById: jest.fn() }));
jest.mock("../models/List", () => ({ findById: jest.fn() }));
jest.mock("../models/Card", () => ({ findById: jest.fn() }));
const Board = require("../models/Board");
const authorization = require("../services/authorizationService");

describe("authorizationService", () => {
  const ownerId = new mongoose.Types.ObjectId();
  const memberId = new mongoose.Types.ObjectId();
  const outsiderId = new mongoose.Types.ObjectId();
  const boardId = new mongoose.Types.ObjectId();
  const makeBoard = () => ({
    _id: boardId,
    owner: ownerId,
    members: [ownerId, memberId],
  });
  // Reset mocks between tests so one scenario cannot leak state into another.
  beforeEach(() => jest.clearAllMocks());

  // Owner access: ownership implies board membership.
  test("owner has member and owner access", async () => {
    Board.findById.mockResolvedValue(makeBoard());
    await expect(
      authorization.requireBoardMember(boardId, ownerId),
    ).resolves.toMatchObject({ isOwner: true, isMember: true, role: "owner" });
  });
  // Ordinary member access: membership is valid, but owner-only permissions are not.
  test("member has member but not owner access", async () => {
    Board.findById.mockResolvedValue(makeBoard());
    await expect(
      authorization.requireBoardMember(boardId, memberId),
    ).resolves.toMatchObject({
      isOwner: false,
      isMember: true,
      role: "member",
    });
  });
  // IDOR defense: knowing the board ID is insufficient without membership.
  test("outsider is denied board access", async () => {
    Board.findById.mockResolvedValue(makeBoard());
    await expect(
      authorization.requireBoardMember(boardId, outsiderId),
    ).rejects.toMatchObject({ status: 403, code: "BOARD_ACCESS_DENIED" });
  });
  // Role boundary: a member must be rejected by owner-only authorization.
  test("member cannot perform owner-only action", async () => {
    Board.findById.mockResolvedValue(makeBoard());
    await expect(
      authorization.requireBoardOwner(boardId, memberId),
    ).rejects.toMatchObject({ status: 403, code: "BOARD_OWNER_REQUIRED" });
  });
  // Resource existence is distinct from permission denial: missing board => 404.
  test("missing board is reported as not found", async () => {
    Board.findById.mockResolvedValue(null);
    await expect(
      authorization.requireBoardMember(boardId, ownerId),
    ).rejects.toMatchObject({ status: 404, code: "BOARD_NOT_FOUND" });
  });
});

describe("list authorization", () => {
  const listId = new mongoose.Types.ObjectId();
  const listBoardId = new mongoose.Types.ObjectId();
  const listOwnerId = new mongoose.Types.ObjectId();
  const listMemberId = new mongoose.Types.ObjectId();
  const listOutsiderId = new mongoose.Types.ObjectId();

  const makeList = () => ({ _id: listId, board: listBoardId });
  const makeListBoard = () => ({
    _id: listBoardId,
    owner: listOwnerId,
    members: [listOwnerId, listMemberId],
  });

  const mockListLookup = () => {
    List.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(makeList()),
    });
  };

  beforeEach(() => jest.clearAllMocks());

  test("board member can access a list through its parent board", async () => {
    mockListLookup();
    Board.findById.mockResolvedValue(makeListBoard());

    await expect(
      authorization.requireListBoardMember(listId, listMemberId),
    ).resolves.toMatchObject({
      list: { _id: listId },
      boardId: listBoardId,
      isMember: true,
      isOwner: false,
    });
  });

  test("outsider cannot access a list even when the list ID is known", async () => {
    mockListLookup();
    Board.findById.mockResolvedValue(makeListBoard());

    await expect(
      authorization.requireListBoardMember(listId, listOutsiderId),
    ).rejects.toMatchObject({
      status: 403,
      code: "BOARD_ACCESS_DENIED",
    });
  });

  test("member cannot use owner-only list authorization", async () => {
    mockListLookup();
    Board.findById.mockResolvedValue(makeListBoard());

    await expect(
      authorization.requireListBoardOwner(listId, listMemberId),
    ).rejects.toMatchObject({
      status: 403,
      code: "BOARD_OWNER_REQUIRED",
    });
  });

  test("board owner passes owner-only list authorization", async () => {
    mockListLookup();
    Board.findById.mockResolvedValue(makeListBoard());

    await expect(
      authorization.requireListBoardOwner(listId, listOwnerId),
    ).resolves.toMatchObject({
      list: { _id: listId },
      boardId: listBoardId,
      isMember: true,
      isOwner: true,
    });
  });

  test("missing list is reported before board authorization", async () => {
    List.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      authorization.requireListBoardMember(listId, listMemberId),
    ).rejects.toMatchObject({
      status: 404,
      code: "LIST_NOT_FOUND",
    });
    expect(Board.findById).not.toHaveBeenCalled();
  });
});

describe("card authorization", () => {
  const cardId = new mongoose.Types.ObjectId();
  const cardBoardId = new mongoose.Types.ObjectId();
  const cardListId = new mongoose.Types.ObjectId();
  const cardOwnerId = new mongoose.Types.ObjectId();
  const cardMemberId = new mongoose.Types.ObjectId();
  const cardOutsiderId = new mongoose.Types.ObjectId();

  const makeCard = () => ({
    _id: cardId,
    board: cardBoardId,
    list: cardListId,
  });

  const makeCardBoard = () => ({
    _id: cardBoardId,
    owner: cardOwnerId,
    members: [cardOwnerId, cardMemberId],
  });

  const mockCardLookup = (card = makeCard()) => {
    Card.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(card),
    });
  };

  beforeEach(() => jest.clearAllMocks());

  // Ordinary board members can work with cards that belong to their board.
  test("board member can access a card through its parent board", async () => {
    mockCardLookup();
    Board.findById.mockResolvedValue(makeCardBoard());

    await expect(
      authorization.requireCardBoardMember(cardId, cardMemberId),
    ).resolves.toMatchObject({
      card: { _id: cardId },
      boardId: cardBoardId,
      isMember: true,
      isOwner: false,
    });
  });

  // Knowing a card ID does not grant access to the board that owns the card.
  test("outsider cannot access a card even when the card ID is known", async () => {
    mockCardLookup();
    Board.findById.mockResolvedValue(makeCardBoard());

    await expect(
      authorization.requireCardBoardMember(cardId, cardOutsiderId),
    ).rejects.toMatchObject({
      status: 403,
      code: "BOARD_ACCESS_DENIED",
    });
  });

  // Ownership is still represented by the parent board, not by the card itself.
  test("board owner passes card authorization", async () => {
    mockCardLookup();
    Board.findById.mockResolvedValue(makeCardBoard());

    await expect(
      authorization.requireCardBoardMember(cardId, cardOwnerId),
    ).resolves.toMatchObject({
      card: { _id: cardId },
      boardId: cardBoardId,
      isMember: true,
      isOwner: true,
    });
  });

  // A missing card is reported before any board authorization is attempted.
  test("missing card is reported before board authorization", async () => {
    Card.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      authorization.requireCardBoardMember(cardId, cardMemberId),
    ).rejects.toMatchObject({
      status: 404,
      code: "CARD_NOT_FOUND",
    });
    expect(Board.findById).not.toHaveBeenCalled();
  });

  // Compatibility rule: older cards without a direct board reference can still be
  // authorized through Card -> List -> Board using the existing Phase 9 contract.
  test("card authorization falls back through its parent list when board is absent", async () => {
    mockCardLookup({
      _id: cardId,
      board: null,
      list: cardListId,
    });
    List.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: cardListId,
        board: cardBoardId,
      }),
    });
    Board.findById.mockResolvedValue(makeCardBoard());

    await expect(
      authorization.requireCardBoardMember(cardId, cardMemberId),
    ).resolves.toMatchObject({
      card: { _id: cardId },
      boardId: cardBoardId,
      isMember: true,
    });
  });
});
