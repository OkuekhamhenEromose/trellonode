const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const { validateList, validate } = require('../validators/authValidators');
const auth = require('../middleware/auth');
const { isBoardMember, isListBoardMember, isListBoardOwner } = require('../middleware/permissions');

// Get all lists. If board_id is supplied, the controller performs a centralized
// board-membership check; otherwise the query is already scoped to accessible boards.
router.get('/',
  auth,
  listController.getLists
);

// A list ID is the resource identifier, so authorization must resolve its parent board
// from the database rather than treating the list ID as a board ID.
router.get('/:id',
  auth,
  listController.getList,
  isListBoardMember
);

// Creating a list uses the board ID supplied in the request body, so the existing
// board-member middleware remains the correct adapter for this route.
router.post('/',
  auth,
  isBoardMember,
  validateList,
  validate,
  listController.createList
);

// Updating a list must authorize through the list's actual parent board.
router.put('/:id',
  auth,
  isBoardMember,
  validateList,
  validate,
  listController.updateList
);

// Deleting a list is owner-only, resolved through the list -> board relationship.
router.delete('/:id',
  auth,
  listController.deleteList,
  isListBoardOwner
);


module.exports = router;
