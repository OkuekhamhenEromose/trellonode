const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  activity_type: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'MOVE', 'COMMENT', 'COMPLETE'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Auto-populate user
activitySchema.pre('find', function() {
  this.populate('user', 'username email profile.fullname');
});

activitySchema.pre('findOne', function() {
  this.populate('user', 'username email profile.fullname');
});

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;