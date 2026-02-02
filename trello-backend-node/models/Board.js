const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  background_color: {
    type: String,
    default: '#0079BF',
    maxlength: 7
  },
  background_image: {
    type: String,
    default: null
  },
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-populate owner and members
boardSchema.pre('find', function() {
  this.populate('owner', 'username email profile.fullname')
       .populate('members', 'username email profile.fullname');
});

boardSchema.pre('findOne', function() {
  this.populate('owner', 'username email profile.fullname')
       .populate('members', 'username email profile.fullname');
});

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;