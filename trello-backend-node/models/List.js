const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  position: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Auto-assign position if not provided
listSchema.pre('save', async function(next) {
  if (this.isNew && !this.position) {
    try {
      const maxPosition = await this.constructor
        .findOne({ board: this.board })
        .sort('-position')
        .select('position');
      
      this.position = (maxPosition ? maxPosition.position : -1) + 1;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Ensure unique position per board
listSchema.index({ board: 1, position: 1 }, { unique: true });

// Auto-populate board
listSchema.pre('find', function() {
  this.populate('board');
});

listSchema.pre('findOne', function() {
  this.populate('board');
});

const List = mongoose.model('List', listSchema);

module.exports = List;