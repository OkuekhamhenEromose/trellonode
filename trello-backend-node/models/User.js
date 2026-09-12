const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// console.log('🆕 NEW User.js file loaded for Mongoose 9.x');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // Password is required only for non-Google users
      return !this.googleId;
    },
    minlength: 8,
    select: false
  },
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  googleId: {  // ✅ ADD THIS FIELD
    type: String,
    sparse: true,
    index: true
  },
  profile: {
    fullname: { type: String, trim: true },
    avatar: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date
}, {
  timestamps: true
});

// CORRECT pre-save middleware for Mongoose 9.x - WITHOUT next parameter
userSchema.pre('save', async function() {

  const user = this;

  if (!user.isModified('password')) {
    return; // Just return, don't call next()
  }

  try {
    // Use async/await with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);

    user.password = hash;
    // Don't call next() - just return
  } catch (error) {
    throw error; // Throw the error instead of calling next(error)
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Remove any existing model to prevent conflicts
if (mongoose.models.User) {
  console.log('⚠️ Removing existing User model');
  delete mongoose.models.User;
  delete mongoose.modelSchemas.User;
}

const User = mongoose.model('User', userSchema);
module.exports = User;
