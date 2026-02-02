const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String,
    default: ''
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  position: {
    type: Number,
    default: 0
  },
  due_date: {
    type: Date,
    default: null
  },
  labels: {
    type: [{
      id: String,
      text: String,
      color: String
    }],
    default: []
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: {
    type: [{
      id: String,
      name: String,
      url: String,
      type: String,
      size: Number,
      uploadedAt: Date
    }],
    default: []
  },
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-assign position if not provided
cardSchema.pre('save', async function(next) {
  if (this.isNew && !this.position) {
    try {
      const maxPosition = await this.constructor
        .findOne({ list: this.list })
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

// Ensure unique position per list
cardSchema.index({ list: 1, position: 1 }, { unique: true });

// Auto-populate members and list
cardSchema.pre('find', function() {
  this.populate('members', 'username email profile.fullname')
     .populate({
       path: 'list',
       populate: {
         path: 'board',
         select: 'title owner members'
       }
     });
});

cardSchema.pre('findOne', function() {
  this.populate('members', 'username email profile.fullname')
     .populate({
       path: 'list',
       populate: {
         path: 'board',
         select: 'title owner members'
       }
     });
});

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;