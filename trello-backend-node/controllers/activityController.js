const Activity = require('../models/Activity');
const Board = require('../models/Board');

// Create activity log
exports.createActivity = async (boardId, userId, activityType, description, data = {}) => {
  try {
    const activity = await Activity.create({
      board: boardId,
      user: userId,
      activity_type: activityType,
      description,
      data
    });
    return activity;
  } catch (error) {
    console.error('Error creating activity:', error);
    return null;
  }
};

// Get activities for a board
exports.getBoardActivities = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    // Check if user has access to the board
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Pagination
    const skip = (page - 1) * limit;
    
    const activities = await Activity.find({ board: boardId })
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username email profile.fullname')
      .lean();
    
    const total = await Activity.countDocuments({ board: boardId });
    
    res.status(200).json({
      activities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get board activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

// Get recent activities for user
exports.getUserActivities = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Find boards where user is member
    const userBoards = await Board.find({
      $or: [
        { owner: req.user._id },
        { members: req.user._id }
      ],
      archived: false
    }).select('_id');
    
    const boardIds = userBoards.map(board => board._id);
    
    const activities = await Activity.find({
      board: { $in: boardIds }
    })
      .sort('-createdAt')
      .limit(parseInt(limit))
      .populate('user', 'username email profile.fullname')
      .populate('board', 'title')
      .lean();
    
    res.status(200).json(activities);
  } catch (error) {
    console.error('Get user activities error:', error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
};

// Get activity by ID
exports.getActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('user', 'username email profile.fullname')
      .populate('board', 'title');
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Check if user has access to the board
    const board = await Board.findById(activity.board);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(200).json(activity);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

// Delete activity (admin only)
exports.deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    // Only board owner can delete activities
    const board = await Board.findById(activity.board);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only board owner can delete activities' });
    }
    
    await Activity.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
};

// Clear all activities for a board (admin only)
exports.clearBoardActivities = async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    // Only board owner can clear activities
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only board owner can clear activities' });
    }
    
    await Activity.deleteMany({ board: boardId });
    
    res.status(200).json({ message: 'All activities cleared for this board' });
  } catch (error) {
    console.error('Clear board activities error:', error);
    res.status(500).json({ error: 'Failed to clear activities' });
  }
};

// Log activity middleware
exports.logActivity = (activityType, description, data = {}) => {
  return async (req, res, next) => {
    try {
      // Store the original send function
      const originalSend = res.send;
      
      // Override the send function
      res.send = async function(data) {
        // Call original send
        originalSend.call(this, data);
        
        // Log activity if request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Extract board ID from request
            let boardId;
            
            if (req.params.boardId) {
              boardId = req.params.boardId;
            } else if (req.body.board) {
              boardId = req.body.board;
            } else if (req.body.list) {
              // Need to find board from list
              const List = require('../models/List');
              const list = await List.findById(req.body.list);
              if (list) boardId = list.board;
            } else if (req.params.id) {
              // Check if it's a board ID
              const board = await Board.findById(req.params.id);
              if (board) boardId = board._id;
            }
            
            if (boardId && req.user) {
              await exports.createActivity(
                boardId,
                req.user._id,
                activityType,
                description,
                data
              );
            }
          } catch (error) {
            console.error('Error logging activity:', error);
          }
        }
      };
      
      next();
    } catch (error) {
      console.error('Activity middleware error:', error);
      next();
    }
  };
};