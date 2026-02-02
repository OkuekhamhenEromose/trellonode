const mongoose = require('mongoose');

const checklistSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: "Checklist",
    maxlength: 255
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  }
}, {
  timestamps: true
});

const Checklist = mongoose.model('Checklist', checklistSchema);

module.exports = Checklist;