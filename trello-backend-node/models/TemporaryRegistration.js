const mongoose = require('mongoose');

const temporaryRegistrationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  verificationCode: {
    type: String
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('TemporaryRegistration', temporaryRegistrationSchema);