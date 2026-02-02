const Checklist = require('../models/Checklist');
const ChecklistItem = require('../models/ChecklistItem');
const Card = require('../models/Card');
const Board = require('../models/Board');
const Activity = require('../models/Activity');

// Create checklist
exports.createChecklist = async (req, res) => {
  try {
    const { title, card } = req.body;
    
    const cardDoc = await Card.findById(card).populate('list');
    if (!cardDoc) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    const board = await Board.findById(cardDoc.list.board);
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const checklist = await Checklist.create({
      title: title || 'Checklist',
      card
    });
    
    // Add checklist to card
    await Card.findByIdAndUpdate(card, {
      $push: { checklists: checklist._id }
    });
    
    // Create activity
    await Activity.create({
      board: board._id,
      user: req.user._id,
      activity_type: 'CREATE',
      description: `${req.user.username} added a checklist to card "${cardDoc.title}"`
    });
    
    res.status(201).json(checklist);
  } catch (error) {
    console.error('Create checklist error:', error);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
};

// Add checklist item
exports.addChecklistItem = async (req, res) => {
  try {
    const { text, checklist, position } = req.body;
    
    const checklistDoc = await Checklist.findById(checklist).populate({
      path: 'card',
      populate: { path: 'list' }
    });
    
    if (!checklistDoc) {
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const board = await Board.findById(checklistDoc.card.list.board);
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const item = await ChecklistItem.create({
      text,
      checklist,
      position
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Add checklist item error:', error);
    res.status(500).json({ error: 'Failed to add checklist item' });
  }
};

// Update checklist item
exports.updateChecklistItem = async (req, res) => {
  try {
    const { text, completed } = req.body;
    
    const item = await ChecklistItem.findById(req.params.id).populate({
      path: 'checklist',
      populate: {
        path: 'card',
        populate: { path: 'list' }
      }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const board = await Board.findById(item.checklist.card.list.board);
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isMember = board.members.some(member => 
      member._id.toString() === req.user._id.toString()
    );
    
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (text !== undefined) item.text = text;
    if (completed !== undefined) item.completed = completed;
    
    await item.save();
    
    // Create activity if item completed
    if (completed === true) {
      await Activity.create({
        board: board._id,
        user: req.user._id,
        activity_type: 'COMPLETE',
        description: `${req.user.username} completed a checklist item`
      });
    }
    
    res.status(200).json(item);
  } catch (error) {
    console.error('Update checklist item error:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
};