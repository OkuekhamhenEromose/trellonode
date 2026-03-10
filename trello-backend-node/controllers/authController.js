const authService = require('../services/authService');
const googleService = require('../services/googleService');
const tokenService = require('../services/tokenService');
const User = require('../models/User');
const TemporaryRegistration = require('../models/TemporaryRegistration');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const { v4: uuidv4 } = require('uuid');
const { sendVerificationEmail } = require('../utils/email');

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
  try {
    const { email, verificationCode, token } = req.body;
    
    // ... your existing verification code
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

exports.completeRegistration = async (req, res) => {
  try {
    const { email, token, fullname, username, password, password2 } = req.body;
    
    // ... your existing completion code
  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({ error: 'Registration completion failed' });
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