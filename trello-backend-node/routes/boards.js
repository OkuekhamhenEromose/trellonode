const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');

router.get('/', boardController.getBoards);
router.get('/:id', boardController.getBoard);
router.post('/', boardController.createBoard);
router.put('/:id', boardController.updateBoard);
router.delete('/:id', boardController.archiveBoard);
router.put('/:id/reorder', boardController.reorderLists);
router.get('/:id/activities', boardController.getBoardActivities);

module.exports = router;
