const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-populate author
commentSchema.pre('find', function() {
  this.populate('author', 'username email profile.fullname');
});

commentSchema.pre('findOne', function() {
  this.populate('author', 'username email profile.fullname');
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;