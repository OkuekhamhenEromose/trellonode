// Board routes declare authorization at the HTTP boundary.
//
// Teaching goal: a route should make its security requirement visible before the
// controller runs. The controller still remains responsible for business logic.
const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");
const {isBoardMember, isBoardOwner} = require('../middleware/permissions')

// Listing boards is already scoped to req.user inside the controller.
router.get("/", boardController.getBoards);

// Reading a single board requires board membership.
router.get("/:id", isBoardMember, boardController.getBoard);

// The creator becomes the owner, so no pre-existing board permission is required.
router.post("/", boardController.createBoard);

// Board updates and deletion are owner-only in the Phase 9 policy.
router.put("/:id", isBoardOwner, boardController.updateBoard);
router.delete("/:id", isBoardOwner, boardController.archiveBoard);

// Members may reorder lists; the operation is still scoped to the board.
router.put("/:id/reorder", isBoardMember, boardController.reorderLists);
router.get("/:id/activities", isBoardMember, boardController.getBoardActivities);

module.exports = router;
