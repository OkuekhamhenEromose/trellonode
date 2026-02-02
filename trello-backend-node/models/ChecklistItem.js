const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    maxlength: 255
  },
  checklist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Checklist',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  position: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const ChecklistItem = mongoose.model('ChecklistItem', checklistItemSchema);

module.exports = ChecklistItem;