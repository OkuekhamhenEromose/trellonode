const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const { validateList, validateReorderLists, validate } = require('../validators/authValidators');
const auth = require('../middleware/auth');
const { isBoardMember } = require('../middleware/permissions');

// Get all lists (with optional board filter)
router.get('/', 
  auth, 
  listController.getLists
);

// Get single list
router.get('/:id', 
  auth, 
  listController.getList
);

// Create list
router.post('/', 
  auth, 
  isBoardMember,
  validateList,
  validate,
  listController.createList
);

// Update list
router.put('/:id', 
  auth, 
  isBoardMember,
  validateList,
  validate,
  listController.updateList
);

// Delete list
router.delete('/:id', 
  auth, 
  listController.deleteList
);

// Reorder lists
router.put('/board/:boardId/reorder', 
  auth, 
  validateReorderLists,
  validate,
  listController.reorderLists
);

module.exports = router;