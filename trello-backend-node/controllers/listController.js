const List = require('../models/List');
const Board = require('../models/Board');
const Activity = require('../models/Activity');

// Get all lists (with optional board filter)
exports.getLists = async (req, res) => {
  try {
    const { board_id } = req.query;
    let query = {};
    
    if (board_id) {
      // Check if user has access to this board
      const board = await Board.findById(board_id);
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
      
      query.board = board_id;
    } else {
      // Get lists from all boards user is member of
      const userBoards = await Board.find({
        $or: [
          { owner: req.user._id },
          { members: req.user._id }
        ],
        archived: false
      }).select('_id');
      
      query.board = { $in: userBoards.map(b => b._id) };
    }
    
    const lists = await List.find(query)
      .sort('position')
      .populate('board')
      .populate({
        path: 'cards',
        match: { archived: false },
        options: { sort: { position: 1 } },
        populate: [
          {
            path: 'members',
            select: 'username email profile.fullname'
          }
        ]
      });
    
    res.status(200).json(lists);
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
};

// Get single list
exports.getList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id)
      .populate('board')
      .populate({
        path: 'cards',
        match: { archived: false },
        options: { sort: { position: 1 } },
        populate: [
          {
            path: 'members',
            select: 'username email profile.fullname'
          },
          {
            path: 'comments',
            populate: {
              path: 'author',
              select: 'username email profile.fullname'
            }
          },
          {
            path: 'checklists',
            populate: {
              path: 'items'
            }
          }
        ]
      });
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    // Check board access
    const board = list.board;
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(200).json(list);
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
};

// Create list
exports.createList = async (req, res) => {
  try {
    const { title, board, position } = req.body;
    
    // Check board access
    const boardDoc = await Board.findById(board);
    if (!boardDoc) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    const isOwner = boardDoc.owner.toString() === req.user._id.toString();
    const isMember = boardDoc.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const list = await List.create({
      title,
      board,
      position
    });
    
    // Create activity
    await Activity.create({
      board: boardDoc._id,
      user: req.user._id,
      activity_type: 'CREATE',
      description: `${req.user.username} created list "${list.title}"`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${boardDoc._id}`).emit('list_created', list);
    
    res.status(201).json(list);
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
};

// Update list
exports.updateList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id).populate('board');
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    // Check board access
    const board = list.board;
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.position !== undefined) updates.position = req.body.position;
    
    const updatedList = await List.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    // Create activity
    await Activity.create({
      board: board._id,
      user: req.user._id,
      activity_type: 'UPDATE',
      description: `${req.user.username} updated list "${list.title}"`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('list_updated', updatedList);
    
    res.status(200).json(updatedList);
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Failed to update list' });
  }
};

// Delete list
exports.deleteList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id).populate('board');
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    // Check board access (owner only for delete)
    if (list.board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only board owner can delete lists' });
    }
    
    await List.findByIdAndDelete(req.params.id);
    
    // Create activity
    await Activity.create({
      board: list.board._id,
      user: req.user._id,
      activity_type: 'DELETE',
      description: `${req.user.username} deleted list "${list.title}"`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${list.board._id}`).emit('list_deleted', { listId: list._id });
    
    res.status(200).json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
};