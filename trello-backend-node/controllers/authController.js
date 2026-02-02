const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, TemporaryRegistration, EmailVerificationToken } = require('../models/User');
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/email');
// Add these imports if not already present
const { validationResult } = require('express-validator');
const { validate } = require('../validators/authValidators');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1d' }
  );
};

// Start Registration
exports.startRegistration = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if email is already registered
    const existingUser = await User.findOne({ email, isActive: true });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }
    
    // Delete any existing temporary registrations
    await TemporaryRegistration.deleteMany({ email });
    
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create temporary registration
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const token = uuidv4();
    
    const tempReg = await TemporaryRegistration.create({
      email,
      verificationCode,
      token,
      expiresAt,
      isVerified: false
    });
    
    // Send verification email
    await sendVerificationEmail(email, verificationCode, token);
    
    res.status(200).json({
      message: 'Verification email sent',
      email,
      token: tempReg.token,
      expiresAt
    });
  } catch (error) {
    console.error('Start registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode, token } = req.body;
    
    // Find temporary registration
    const tempReg = await TemporaryRegistration.findOne({
      email,
      expiresAt: { $gt: new Date() }
    });
    
    if (!tempReg) {
      return res.status(400).json({ error: 'Verification expired or invalid.' });
    }
    
    // Validate verification code or token
    if (verificationCode && tempReg.verificationCode !== verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }
    
    if (token && tempReg.token !== token) {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }
    
    // Mark as verified
    tempReg.isVerified = true;
    await tempReg.save();
    
    res.status(200).json({
      message: 'Email verified successfully',
      email,
      token: tempReg.token,
      verified: true
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

// Complete Registration
exports.completeRegistration = async (req, res) => {
  try {
    const { email, token, fullname, username, password, password2 } = req.body;
    
    // Validate passwords match
    if (password !== password2) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    
    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }
    
    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'This username is already taken.' });
    }
    
    // Verify temporary registration
    const tempReg = await TemporaryRegistration.findOne({
      email,
      token,
      expiresAt: { $gt: new Date() },
      isVerified: true
    });
    
    if (!tempReg) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }
    
    // Create user
    const user = await User.create({
      username,
      email,
      password,
      profile: { fullname },
      isActive: true
    });
    
    // Create email verification token
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await EmailVerificationToken.create({
      user: user._id,
      token: uuidv4(),
      expiresAt
    });
    
    // Delete temporary registration
    await TemporaryRegistration.findByIdAndDelete(tempReg._id);
    
    // Send welcome email
    await sendWelcomeEmail(email, fullname);
    
    // Generate tokens
    const accessToken = generateToken(user._id);
    
    res.status(201).json({
      message: 'Registration completed successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile
      },
      token: accessToken
    });
  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({ error: 'Registration completion failed' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email && !username) {
      return res.status(400).json({ error: 'Either email or username is required.' });
    }
    
    // Find user by email or username
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else {
      user = await User.findOne({ username });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    // In JWT, we just remove token from client side
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};
    
    if (req.body.fullname) {
      updates['profile.fullname'] = req.body.fullname;
    }
    
    if (req.body.phone) {
      updates['profile.phone'] = req.body.phone;
    }
    
    if (req.body.firstName) {
      updates.firstName = req.body.firstName;
    }
    
    if (req.body.lastName) {
      updates.lastName = req.body.lastName;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Check Email Availability
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const emailExists = await User.exists({ email, isActive: true });
    
    res.status(200).json({
      email,
      available: !emailExists,
      exists: emailExists
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
};