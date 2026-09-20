// HTTP middleware adapter for the centralized authorization service.
//
// Teaching goal: middleware should translate HTTP request data into authorization
// calls; the actual permission policy belongs in authorizationService.js.
const authorization = require('../services/authorizationService')

// Convert authorization exceptions into a consistent API response shape.
const handleAuthorizationError = (res, error) => res.status(error.status || 500).json({
  error: error.message || 'Authorization check failed',
  code: error.code || 'AUTHORIZATION_FAILED',
});

// The same middleware can support board IDs supplied by different route/body/query
// shapes used by the existing application. More explicit resource middleware can be
// added later as list/card routes are hardened.
const resolveBoardId = (req) => req.params.boardId || req.params.id || req.body.board || req.body.boardId || req.query.board_id;

// Require that the authenticated user belongs to the target board.
const isBoardMember = async (req, res, next) => {
  try {
    const boardId = resolveBoardId(req);
    if (!boardId) return res.status(400).json({ error: 'Board information required', code: 'BOARD_ID_REQUIRED' });
    const membership = await authorization.requireBoardMember(boardId, req.user._id);
    req.board = membership.board;
    req.boardMembership = membership;
    return next();
  } catch (error) { return handleAuthorizationError(res, error); }
};

// Require the stronger owner role for board-level administrative operations.
const isBoardOwner = async (req, res, next) => {
  try {
    const boardId = resolveBoardId(req)

    if (!boardId)
      return res.status(404).json({ error: "Board information required", code: 'BOARD_ID_REQUIRED' });
    const membership = await authorization.requireBoardOwner(boardId, req.user._id)
    req.board = membership.board
    req.boardMembership = membership
    next();
  } catch (error) {
    return handleAuthorizationError(res, error)
  }
};

// Require access to a list through its parent board. The caller supplies only the
// list ID; the authorization service resolves the owning board server-side, which
// prevents an IDOR-style request from selecting an unrelated board ID.
// phase 9.2
const isListBoardMember = async (req, res, next) =>{
  try{
    const listId = req.params.id || req.params.listId
    if (!listId) return res.status(400).json({error: 'List information required', code: 'LIST_ID_REQUIRED'});
    const authorizationContext = await authorization.requireListBoardMember(listId, req.user._id)
    req.list = authorizationContext.list
    req.board = authorizationContext.board
    req.boardMembership = authorizationContext
    req.listAuthorization = authorizationContext
    return next()
  }catch(error){return handleAuthorizationError(res, error)}
}

// Require owner access to a list through its parent board. This is used for list
// deletion because ownership belongs to the board, not to the list itself.
const isListBoardOwner = async (req, res, next) => {
  try{
    const listId = req.params.id || req.params.listId
    if (!listId) return res.status(400).json({ error: 'List information required', code: 'LIST_ID_REQUIRED'});
    const authorizationContext = await authorization.requireListBoardOwner(listId, req.user._id)
    req.list = authorizationContext.list
    req.board = authorizationContext.board
    
  }catch(error){

  }
}

// Keep the existing middleware names while also exposing the more descriptive
// require* aliases. This preserves the current route contract during migration.
module.exports = { isBoardMember, isBoardOwner, requireBoardMember: isBoardMember, requireBoardOwner: isBoardOwner };
