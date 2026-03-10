const authService = require('../services/authService');
const googleService = require('../services/googleService');
const tokenService = require('../services/tokenService');
const User = require('../models/User');
const TemporaryRegistration = require('../models/TemporaryRegistration');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const { v4: uuidv4 } = require('uuid');
const { sendVerificationEmail } = require('../utils/email');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};
// ==================== LOGIN FLOW CONTROLLERS ====================

exports.loginEmail = async (req, res) => {
  try {
    const { email } = req.body;
    await authService.validateEmail(email);
    
    // Always return same response for security
    res.json({ nextStep: 'password' });
  } catch (error) {
    res.json({ nextStep: 'password' }); // Don't reveal errors
  }
};

exports.loginPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.authenticatePassword(email, password);
    
    res.json({
      nextStep: result.nextStep,
      message: 'Verification token sent to your email'
    });
  } catch (error) {
    res.status(401).json({ 
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }
};

exports.loginVerifyToken = async (req, res) => {
  try {
    const { email, token } = req.body;
    const rememberMe = req.body.rememberMe || false;
    
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await authService.verifyLoginToken(email, token, rememberMe, deviceInfo);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken: result.accessToken,
      redirect: '/boards'
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// ==================== TOKEN MANAGEMENT ====================

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// ==================== GOOGLE OAUTH ====================

exports.googleAuth = (req, res) => {
  const url = googleService.getAuthUrl();
  res.redirect(url);
};

exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await googleService.handleCallback(code, deviceInfo);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${result.accessToken}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

// ==================== PASSWORD MANAGEMENT ====================

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    
    res.json({ 
      message: 'If an account exists with this email, you will receive a password reset link.' 
    });
  } catch (error) {
    res.json({ 
      message: 'If an account exists with this email, you will receive a password reset link.' 
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ==================== EXISTING CONTROLLERS ====================
exports.startRegistration = async (req, res) => {
  console.log('🔥 START REGISTRATION CALLED');
  
  try {
    const { email } = req.body;
    console.log('Email:', email);
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email, isActive: true });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }
    
    // Delete any existing temporary registrations
    await TemporaryRegistration.deleteMany({ email });
    
    // Generate verification code and token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    // Create temporary registration
    const tempReg = await TemporaryRegistration.create({
      email,
      verificationCode,
      token,
      expiresAt,
      isVerified: false
    });
    
    // Send verification email
    await sendVerificationEmail(email, verificationCode, token);
    
    console.log('✅ Verification email sent to:', email);
    
    res.status(200).json({
      message: 'Verification email sent',
      email,
      token: tempReg.token,
      expiresAt
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.verifyEmail = async (req, res) => {
  console.log('🔍 VERIFY EMAIL CALLED');
  console.log('Request body:', req.body);
  
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({ error: 'Email and token are required' });
    }
    
    // Find temporary registration
    const tempReg = await TemporaryRegistration.findOne({
      email,
      token,
      expiresAt: { $gt: new Date() },
      isVerified: false
    });
    
    if (!tempReg) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    
    // Mark as verified
    tempReg.isVerified = true;
    await tempReg.save();
    
    console.log('✅ Email verified successfully for:', email);
    
    res.json({
      message: 'Email verified successfully',
      email,
      verified: true,
      token: tempReg.token
    });
    
  } catch (error) {
    console.error('❌ Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.completeRegistration = async (req, res) => {
  try {
    const { email, token, fullname, username, password, password2 } = req.body;
    
    console.log("📝 COMPLETE REGISTRATION CALLED");
    console.log("Email:", email);
    console.log("Username:", username);
    console.log("Fullname:", fullname);
    console.log("Password length:", password?.length);
    console.log("Token:", token);
    
    // Check validation
    if (!email || !token || !fullname || !username || !password || !password2) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ 
        error: 'Missing required fields',
        errors: [
          { msg: 'All fields are required' }
        ]
      });
    }
    
    if (password !== password2) {
      console.log("❌ Passwords do not match");
      return res.status(400).json({ 
        error: 'Password validation failed',
        errors: [
          { msg: 'Passwords do not match' }
        ]
      });
    }
    
    // Check if user already exists
    console.log("🔍 Checking if user exists...");
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("❌ Email already registered:", email);
      return res.status(400).json({ 
        error: 'Email already registered',
        errors: [
          { msg: 'This email is already registered' }
        ]
      });
    }
    
    // Check username
    console.log("🔍 Checking if username exists...");
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log("❌ Username already taken:", username);
      return res.status(400).json({ 
        error: 'Username taken',
        errors: [
          { msg: 'This username is already taken' }
        ]
      });
    }
    
    // Verify token
    console.log("🔍 Verifying token...");
    const tempReg = await TemporaryRegistration.findOne({
      email,
      token,
      expiresAt: { $gt: new Date() },
      isVerified: true
    });
    
    if (!tempReg) {
      console.log("❌ Invalid or expired verification token");
      return res.status(400).json({ 
        error: 'Invalid token',
        errors: [
          { msg: 'Invalid or expired verification token' }
        ]
      });
    }
    
    console.log("✅ Token verified, creating user...");
    
    // Create user
    const user = await User.create({
      username,
      email,
      password,
      profile: { fullname },
      isActive: true
    });
    
    console.log("✅ User created:", user._id);
    
    // Delete temp registration
    await TemporaryRegistration.findByIdAndDelete(tempReg._id);
    
    // Generate token
    const accessToken = generateToken(user._id);
    
    console.log("✅ Registration complete, sending response");
    
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
    console.error('❌ COMPLETE REGISTRATION ERROR:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check if it's a Mongoose validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: Object.values(error.errors).map(e => ({ msg: e.message }))
      });
    }
    
    // Check if it's a duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: 'Duplicate field',
        errors: [{ msg: `${field} already exists` }]
      });
    }
    
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    // ... your existing login code
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(refreshToken);
    
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

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

exports.updateProfile = async (req, res) => {
  try {
    // ... your existing update profile code
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

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
console.log('✅ authController loaded with functions:', Object.keys(module.exports));