const Board = require('../models/Board');

const isBoardMember = async (req, res, next) => {
  try {
    let boardId;
    
    // Extract boardId from different object types
    if (req.body.board) {
      boardId = req.body.board;
    } else if (req.body.list) {
      const list = await List.findById(req.body.list);
      boardId = list?.board;
    } else if (req.params.boardId) {
      boardId = req.params.boardId;
    } else if (req.query.board_id) {
      boardId = req.query.board_id;
    } else {
      return res.status(400).json({ error: 'Board information required' });
    }
    
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied. Not a board member.' });
    }
    
    req.board = board;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Permission check failed' });
  }
};

const isBoardOwner = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.body.boardId;
    const board = await Board.findById(boardId);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied. Board owner only.' });
    }
    
    req.board = board;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Permission check failed' });
  }
};

module.exports = { isBoardMember, isBoardOwner };