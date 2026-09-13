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

// Keep the board ownership invariant true at the model boundary:
// the owner must always be a member, and membership IDs must be unique.
// This protects the invariant even when a future code path bypasses the
// controller-level membership preparation.
boardSchema.pre('validate', function(next) {
  const ownerId = this.owner?.toString()
  const memberIds = Array.isArray(this.members) ? this.members.map((member) => member.toString()) : []
  if(ownerId && !memberIds.includes(ownerId)) memberIds.unshift(ownerId);
  this.members = [...new Set(memberIds)];
  next()
});

// Auto-populate owner and members
boardSchema.pre('findOne', function() {
  this.populate('owner', 'username email profile.fullname')
       .populate('members', 'username email profile.fullname');
});

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;
