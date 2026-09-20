const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const {
  validateCard,
  validateReorderCards,
  validate
} = require('../validators/authValidators');
const auth = require('../middleware/auth');
const { isCardBoardMember, isListBoardMember } = require('../middleware/permissions');

// Card reads without a specific card ID remain scoped by the controller's query.
// When a concrete card ID is supplied, resource-level authorization resolves the
// card's actual parent board before the controller runs.
router.get('/',
  auth,
  cardController.getCards
);

// A card ID is not a board ID. Resolve Card -> Board -> Membership before allowing
// the controller to retrieve the card.
router.get('/:id',
  auth,
  isCardBoardMember,
  cardController.getCard
);

// Card creation is authorized through the target list because the card does not
// exist yet. The middleware resolves List -> Board -> Membership from req.body.list.
router.post('/',
  auth,
  isListBoardMember,
  validateCard,
  validate,
  cardController.createCard
);

// Existing cards are authorized through their persisted card-to-board relationship,
// preventing a caller from substituting an unrelated board identifier.
router.put('/:id',
  auth,
  isCardBoardMember,
  validateCard,
  validate,
  cardController.updateCard
);

// Moving a card starts with authorization to the existing card. The controller also
// verifies the destination list's parent board when the move crosses lists/boards.
router.put('/:id/move',
  auth,
  isBoardMember,
  validateReorderCards,
  validate,
  cardController.moveCard
);

module.exports = router;
