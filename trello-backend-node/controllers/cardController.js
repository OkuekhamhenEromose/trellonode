const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const Activity = require('../models/Activity');

// Get all cards (with optional list filter)
exports.getCards = async (req, res) => {
  try {
    const { list_id } = req.query;
    let query = { archived: false };
    
    if (list_id) {
      const list = await List.findById(list_id);
      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }
      
      // Check board access
      const board = await Board.findById(list.board);
      const isOwner = board.owner.toString() === req.user._id.toString();
      const isMember = board.members.some(member => 
        member._id.toString() === req.user._id.toString()
      );
      
      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      query.list = list_id;
    } else {
      // Get cards from all boards user is member of
      const userBoards = await Board.find({
        $or: [
          { owner: req.user._id },
          { members: req.user._id }
        ],
        archived: false
      }).select('_id');
      
      const lists = await List.find({ board: { $in: userBoards } }).select('_id');
      query.list = { $in: lists.map(l => l._id) };
    }
    
    const cards = await Card.find(query)
      .sort('position')
      .populate('members', 'username email profile.fullname')
      .populate('list')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username email profile.fullname'
        }
      })
      .populate({
        path: 'checklists',
        populate: {
          path: 'items'
        }
      });
    
    res.status(200).json(cards);
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
};

// Get single card
exports.getCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('members', 'username email profile.fullname')
      .populate({
        path: 'list',
        populate: {
          path: 'board'
        }
      })
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username email profile.fullname'
        }
      })
      .populate({
        path: 'checklists',
        populate: {
          path: 'items'
        }
      });
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    // Check board access
    const board = card.list.board;
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(200).json(card);
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
};

// Create card
exports.createCard = async (req, res) => {
  try {
    const { title, description, list, position, due_date, labels, member_ids, attachments } = req.body;
    
    // Check list access
    const listDoc = await List.findById(list).populate('board');
    if (!listDoc) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    const board = listDoc.board;
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const card = await Card.create({
      title,
      description: description || '',
      list,
      position,
      due_date: due_date || null,
      labels: labels || [],
      members: member_ids || [],
      attachments: attachments || [],
      archived: false
    });
    
    // Create activity
    await Activity.create({
      board: board._id,
      user: req.user._id,
      activity_type: 'CREATE',
      description: `${req.user.username} created card "${card.title}"`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('card_created', card);
    
    const populatedCard = await Card.findById(card._id)
      .populate('members', 'username email profile.fullname')
      .populate('list');
    
    res.status(201).json(populatedCard);
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
};

// Update card
exports.updateCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id).populate({
      path: 'list',
      populate: {
        path: 'board'
      }
    });
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    // Check board access
    const board = card.list.board;
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.position !== undefined) updates.position = req.body.position;
    if (req.body.due_date !== undefined) updates.due_date = req.body.due_date;
    if (req.body.labels !== undefined) updates.labels = req.body.labels;
    if (req.body.member_ids !== undefined) updates.members = req.body.member_ids;
    if (req.body.attachments !== undefined) updates.attachments = req.body.attachments;
    if (req.body.archived !== undefined) updates.archived = req.body.archived;
    
    const updatedCard = await Card.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('members', 'username email profile.fullname')
    .populate({
      path: 'list',
      populate: {
        path: 'board'
      }
    });
    
    // Create activity
    await Activity.create({
      board: board._id,
      user: req.user._id,
      activity_type: 'UPDATE',
      description: `${req.user.username} updated card "${card.title}"`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('card_updated', updatedCard);
    
    res.status(200).json(updatedCard);
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
};

// Move card
exports.moveCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    const { destination_list_id, position, source_list_id } = req.body;
    
    let oldList, newList;
    
    if (destination_list_id) {
      // Move to different list
      newList = await List.findById(destination_list_id).populate('board');
      oldList = await List.findById(card.list).populate('board');
      
      if (!newList || !oldList) {
        return res.status(404).json({ error: 'List not found' });
      }
      
      // Check access to both boards
      const oldBoard = oldList.board;
      const newBoard = newList.board;
      
      const hasOldAccess = oldBoard.owner.toString() === req.user._id.toString() || 
                         oldBoard.members.some(m => m._id.toString() === req.user._id.toString());
      
      const hasNewAccess = newBoard.owner.toString() === req.user._id.toString() || 
                         newBoard.members.some(m => m._id.toString() === req.user._id.toString());
      
      if (!hasOldAccess || !hasNewAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      card.list = destination_list_id;
      card.position = position || 0;
      await card.save();
      
      // Create activity
      await Activity.create({
        board: newBoard._id,
        user: req.user._id,
        activity_type: 'MOVE',
        description: `${req.user.username} moved card "${card.title}" from "${oldList.title}" to "${newList.title}"`
      });
      
      // Emit socket events to both boards
      const io = req.app.get('io');
      io.to(`board-${oldBoard._id}`).emit('card_moved', {
        cardId: card._id,
        fromList: oldList._id,
        toList: newList._id
      });
      io.to(`board-${newBoard._id}`).emit('card_moved', {
        cardId: card._id,
        fromList: oldList._id,
        toList: newList._id
      });
      
    } else {
      // Reorder within same list
      card.position = position || 0;
      await card.save();
      
      const list = await List.findById(card.list).populate('board');
      
      // Create activity
      await Activity.create({
        board: list.board._id,
        user: req.user._id,
        activity_type: 'MOVE',
        description: `${req.user.username} reordered card "${card.title}"`
      });
      
      // Emit socket event
      const io = req.app.get('io');
      io.to(`board-${list.board._id}`).emit('card_reordered', {
        cardId: card._id,
        listId: list._id,
        position
      });
    }
    
    const updatedCard = await Card.findById(card._id)
      .populate('members', 'username email profile.fullname')
      .populate('list');
    
    res.status(200).json(updatedCard);
  } catch (error) {
    console.error('Move card error:', error);
    res.status(500).json({ error: 'Failed to move card' });
  }
};