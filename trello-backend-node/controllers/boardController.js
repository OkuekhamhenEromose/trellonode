const Board = require('../models/Board');
const List = require('../models/List');
const Activity = require('../models/Activity');
const { validationResult } = require('express-validator');

// Create activity log
const createActivity = async (boardId, userId, activityType, description, data = {}) => {
  await Activity.create({
    board: boardId,
    user: userId,
    activity_type: activityType,
    description,
    data
  });
};

// Get all boards for user
exports.getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      archived: false,
      $or: [
        { owner: req.user._id },
        { members: req.user._id }
      ]
    })
    .sort('-createdAt')
    .populate('owner', 'username email profile.fullname')
    .populate('members', 'username email profile.fullname');
    
    res.status(200).json(boards);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
};

// Get single board
exports.getBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('owner', 'username email profile.fullname')
      .populate('members', 'username email profile.fullname');
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    // Check if user is owner or member
    const isOwner = board.owner._id.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get lists with cards
    const lists = await List.find({ board: board._id })
      .sort('position')
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
    
    res.status(200).json({
      ...board.toObject(),
      lists
    });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
};

// Create board
exports.createBoard = async (req, res) => {
  try {
    const { title, description, background_color, member_ids } = req.body;
    
    const board = await Board.create({
      title,
      description: description || '',
      owner: req.user._id,
      background_color: background_color || '#0079BF',
      members: [req.user._id, ...(member_ids || [])]
    });
    
    // Add owner as member
    await Board.findByIdAndUpdate(board._id, {
      $addToSet: { members: req.user._id }
    });
    
    // Create activity
    await createActivity(
      board._id,
      req.user._id,
      'CREATE',
      `${req.user.username} created board "${board.title}"`
    );
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('board_created', board);
    
    res.status(201).json(board);
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
};

// Update board
exports.updateBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    // Check if user is owner
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only board owner can update' });
    }
    
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.background_color !== undefined) updates.background_color = req.body.background_color;
    if (req.body.member_ids !== undefined) updates.members = req.body.member_ids;
    
    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('owner', 'username email profile.fullname')
    .populate('members', 'username email profile.fullname');
    
    // Create activity
    await createActivity(
      board._id,
      req.user._id,
      'UPDATE',
      `${req.user.username} updated board "${board.title}"`
    );
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('board_updated', updatedBoard);
    
    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
};

// Archive board (soft delete)
exports.archiveBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    // Check if user is owner
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only board owner can archive' });
    }
    
    board.archived = true;
    await board.save();
    
    // Create activity
    await createActivity(
      board._id,
      req.user._id,
      'DELETE',
      `${req.user.username} archived board "${board.title}"`
    );
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('board_archived', board);
    
    res.status(200).json({ message: 'Board archived successfully' });
  } catch (error) {
    console.error('Archive board error:', error);
    res.status(500).json({ error: 'Failed to archive board' });
  }
};

// Reorder lists
exports.reorderLists = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    const { lists } = req.body;
    
    if (!Array.isArray(lists) || lists.length === 0) {
      return res.status(400).json({ error: 'Lists array is required' });
    }
    
    // Validate all lists belong to this board
    const listCount = await List.countDocuments({
      _id: { $in: lists },
      board: board._id
    });
    
    if (listCount !== lists.length) {
      return res.status(400).json({ error: 'Invalid list IDs' });
    }
    
    // Update positions
    for (let i = 0; i < lists.length; i++) {
      await List.findByIdAndUpdate(lists[i], { position: i });
    }
    
    // Create activity
    await createActivity(
      board._id,
      req.user._id,
      'MOVE',
      `${req.user.username} reordered lists`
    );
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('lists_reordered', { boardId: board._id, lists });
    
    res.status(200).json({ message: 'Lists reordered successfully' });
  } catch (error) {
    console.error('Reorder lists error:', error);
    res.status(500).json({ error: 'Failed to reorder lists' });
  }
};

// Get board activities
exports.getBoardActivities = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    const activities = await Activity.find({ board: board._id })
      .sort('-createdAt')
      .limit(50)
      .populate('user', 'username email profile.fullname');
    
    res.status(200).json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};