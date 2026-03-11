const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('🆕 NEW User.js file loaded for Mongoose 9.x');

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
    required: true,
    minlength: 8,
    select: false
  },
  username: {
    type: String,
    unique: true,
    sparse: true
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
  console.log('📝 Pre-save middleware running for user:', this.email);
  
  const user = this;
  
  if (!user.isModified('password')) {
    console.log('🔑 Password not modified, skipping hash');
    return; // Just return, don't call next()
  }
  
  console.log('🔑 Hashing password...');
  
  try {
    // Use async/await with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    
    console.log('✅ Password hashed successfully');
    user.password = hash;
    // Don't call next() - just return
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    throw error; // Throw the error instead of calling next(error)
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔍 Comparing password...');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('❌ Password comparison error:', error);
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
console.log('✅ NEW User model compiled successfully for Mongoose 9.x');
module.exports = User;