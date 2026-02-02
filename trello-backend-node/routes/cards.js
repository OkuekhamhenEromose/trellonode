const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { 
  validateCard, 
  validateReorderCards, 
  validateComment, 
  validateChecklist,
  validateChecklistItem,
  validate 
} = require('../validators/authValidators');
const auth = require('../middleware/auth');
const { isBoardMember } = require('../middleware/permissions');

// Get all cards
router.get('/', 
  auth, 
  cardController.getCards
);

// Get single card
router.get('/:id', 
  auth, 
  cardController.getCard
);

// Create card
router.post('/', 
  auth, 
  isBoardMember,
  validateCard,
  validate,
  cardController.createCard
);

// Update card
router.put('/:id', 
  auth, 
  isBoardMember,
  validateCard,
  validate,
  cardController.updateCard
);

// Move/reorder card
router.put('/:id/move', 
  auth, 
  isBoardMember,
  validateReorderCards,
  validate,
  cardController.moveCard
);

module.exports = router;