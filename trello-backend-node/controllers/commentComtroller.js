const Comment = require('../models/Comment');
const Card = require('../models/Card');
const Board = require('../models/Board');
const Activity = require('../models/Activity');

// Create comment
exports.createComment = async (req, res) => {
  try {
    const { text, card } = req.body;
    
    // Check card access
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
    
    const comment = await Comment.create({
      text,
      card,
      author: req.user._id
    });
    
    // Add comment to card
    await Card.findByIdAndUpdate(card, {
      $push: { comments: comment._id }
    });
    
    // Create activity
    await Activity.create({
      board: board._id,
      user: req.user._id,
      activity_type: 'COMMENT',
      description: `${req.user.username} commented on card "${cardDoc.title}"`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('comment_created', comment);
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username email profile.fullname');
    
    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// Update comment
exports.updateComment = async (req, res) => {
  try {
    const { text } = req.body;
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user is author
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only author can update comment' });
    }
    
    comment.text = text;
    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username email profile.fullname');
    
    res.status(200).json(populatedComment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user is author or board owner
    const card = await Card.findById(comment.card).populate('list');
    const board = await Board.findById(card.list.board);
    
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isBoardOwner = board.owner.toString() === req.user._id.toString();
    
    if (!isAuthor && !isBoardOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Remove comment from card
    await Card.findByIdAndUpdate(comment.card, {
      $pull: { comments: comment._id }
    });
    
    await Comment.findByIdAndDelete(req.params.id);
    
    // Create activity
    await Activity.create({
      board: board._id,
      user: req.user._id,
      activity_type: 'DELETE',
      description: `${req.user.username} deleted a comment`
    });
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`board-${board._id}`).emit('comment_deleted', { commentId: comment._id });
    
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};