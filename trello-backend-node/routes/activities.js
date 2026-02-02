const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const auth = require('../middleware/auth');

// Get activities for a board
router.get('/board/:boardId', 
  auth, 
  activityController.getBoardActivities
);

// Get recent activities for user
router.get('/user', 
  auth, 
  activityController.getUserActivities
);

// Get single activity
router.get('/:id', 
  auth, 
  activityController.getActivity
);

// Delete activity (owner only)
router.delete('/:id', 
  auth, 
  activityController.deleteActivity
);

// Clear all activities for a board (owner only)
router.delete('/board/:boardId/clear', 
  auth, 
  activityController.clearBoardActivities
);

module.exports = router;