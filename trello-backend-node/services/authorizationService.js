// Central authorization service for Phase 9.1.
//
// Teaching goal: keep authorization decisions in one reusable backend layer
// instead of duplicating board-membership checks throughout controllers.
const mongoose = require("mongoose");
const Board = require("../models/Board");
const List = require("../models/List");
const Card = require("../models/Card");

// Normalize either a raw ObjectId or a populated document into a comparable string.
// This matters because Mongoose fields may be ObjectIds or populated objects depending
// on the query that produced them.
const toIdString = (value) => {
  if (!value) return null;
  return (value._id || value).toString();
};

// Ownership is stronger than ordinary membership.
//
// IMPORTANT:
// The parameter order is (board, userId) because every authorization call in this
// service supplies the board first and the authenticated user second.
const isOwner = (board, userId) =>
  toIdString(board.owner) === toIdString(userId);

// Membership is evaluated from server-side board data. Knowing a board ID alone
// never makes a caller a member.
const isMember = (board, userId) => {
  const id = toIdString(userId);

  return (
    Array.isArray(board.members) &&
    board.members.some((member) => toIdString(member) === id)
  );
};

// Validate IDs before querying MongoDB. This gives callers a predictable 400-level
// error instead of allowing malformed identifiers to leak into lower-level failures.
const assertObjectId = (id, resourceName = "resource") => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(`Invalid ${resourceName} ID`);
    error.status = 400;
    error.code = "INVALID_ID";
    throw error;
  }
};

// Load a board as the root authorization resource. A missing board is different
// from an existing board that denies the caller access, so these become 404 vs 403.
const getBoard = async (boardId) => {
  assertObjectId(boardId, "board");

  const board = await Board.findById(boardId);

  if (!board) {
    const error = new Error("Board not found");
    error.status = 404;
    error.code = "BOARD_NOT_FOUND";
    throw error;
  }

  return board;
};

// Resolve the caller's relationship to a board once and return a small authorization
// context that middleware/controllers can reuse.
const getBoardMembership = async (boardId, userId) => {
  const board = await getBoard(boardId);

  const owner = isOwner(board, userId);
  const member = owner || isMember(board, userId);

  return {
    board,
    userId: toIdString(userId),
    isOwner: owner,
    isMember: member,
    role: owner ? "owner" : member ? "member" : null,
  };
};

// Require ordinary board access. Owners also satisfy this check because ownership
// implies membership for this application's authorization model.
const requireBoardMember = async (boardId, userId) => {
  const membership = await getBoardMembership(boardId, userId);

  if (!membership.isMember) {
    const error = new Error("Board access denied");
    error.status = 403;
    error.code = "BOARD_ACCESS_DENIED";
    throw error;
  }

  return membership;
};

// Require the stronger owner permission. This is intentionally separate from
// requireBoardMember so destructive/administrative actions can be explicit.
const requireBoardOwner = async (boardId, userId) => {
  const membership = await getBoardMembership(boardId, userId);

  // IMPORTANT:
  // Check the authorization result returned by getBoardMembership().
  // Do not check isMember.isOwner because isMember is a function.
  if (!membership.isOwner) {
    const error = new Error("Board owner permission required");
    error.status = 403;
    error.code = "BOARD_OWNER_REQUIRED";
    throw error;
  }

  return membership;
};

// Lists do not authorize themselves. A list belongs to a board, so resolve its
// parent board and then apply the board membership rule.
const getBoardIdForList = async (listId) => {
  assertObjectId(listId, "list");

  const list = await List.findById(listId).select("board");

  if (!list) {
    const error = new Error("List not found");
    error.status = 404;
    error.code = "LIST_NOT_FOUND";
    throw error;
  }

  return {
    list,
    boardId: list.board,
  };
};

// Resource-level authorization follows the domain relationship:
// List -> Board -> Membership.
const requireListBoardMember = async (listId, userId) => {
  const resource = await getBoardIdForList(listId);

  return {
    ...resource,
    ...(await requireBoardMember(resource.boardId, userId)),
  };
};

// Cards can carry a direct board reference, but this exact Phase 9 implementation
// retains a fallback through Card -> List -> Board for compatibility with the
// existing project data model.
const getBoardIdForCard = async (cardId) => {
  assertObjectId(cardId, "card");

  const card = await Card.findById(cardId).select("list board");

  if (!card) {
    const error = new Error("Card not found");
    error.status = 404;
    error.code = "CARD_NOT_FOUND";
    throw error;
  }

  if (card.board) {
    return {
      card,
      boardId: card.board,
    };
  }

  const resource = await getBoardIdForList(card.list);

  return {
    card,
    ...resource,
  };
};

// Resource-level authorization follows the domain relationship:
// Card -> Board (or Card -> List -> Board) -> Membership.
//
// IMPORTANT:
// This is member-level access, not owner-only access.
// A board member who is allowed to work with cards must not be rejected simply
// because they are not the board owner.
const requireCardBoardMember = async (cardId, userId) => {
  const resource = await getBoardIdForCard(cardId);

  return {
    ...resource,
    ...(await requireBoardMember(resource.boardId, userId)),
  };
};

// These predicates answer policy questions without performing database I/O.
// They are useful when a board document has already been loaded.
const canViewBoard = (board, userId) =>
  isOwner(board, userId) || isMember(board, userId);

const canEditBoard = (board, userId) => isOwner(board, userId);

const canDeleteBoard = (board, userId) => isOwner(board, userId);

const canManageMembers = (board, userId) => isOwner(board, userId);

// Export the complete Phase 9.1 authorization contract for middleware, controllers,
// and future list/card/nested-resource authorization checkpoints.
module.exports = {
  toIdString,
  isOwner,
  isMember,
  assertObjectId,
  getBoard,
  getBoardMembership,
  requireBoardMember,
  requireBoardOwner,
  requireListBoardMember,
  requireCardBoardMember,
  canViewBoard,
  canEditBoard,
  canDeleteBoard,
  canManageMembers,
};
