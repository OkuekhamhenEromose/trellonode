const User = require('../models/User');
const Token = require('../models/Token');
const RefreshToken = require('../models/RefreshToken');
const tokenService = require('./tokenService');
const emailService = require('./emailService');
const bcrypt = require('bcryptjs');

class AuthService {
  async validateEmail(email) {
    const user = await User.findOne({ email });
    return { exists: !!user };
  }

  async authenticatePassword(email, password) {
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

    // Generic error to prevent enumeration
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.isLocked && user.isLocked()) {
      throw new Error('Account temporarily locked. Try again later.');
    }

    const isValid = await user.comparePassword(password);
    
    if (!isValid) {
      if (user.incLoginAttempts) {
        await user.incLoginAttempts();
      } else {
        // Manual increment if method doesn't exist
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
        await user.save();
      }
      throw new Error('Invalid credentials');
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Generate and send 2FA token
    const loginToken = await tokenService.generateLoginToken(user._id);
    await emailService.sendLoginToken(email, loginToken);

    return { 
      nextStep: 'token-verification',
      userId: user._id 
    };
  }

  async verifyLoginToken(email, token, rememberMe = false, deviceInfo = {}) {
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('Invalid token');
    }

    const isValid = await tokenService.verifyLoginToken(user._id, token);
    
    if (!isValid) {
      throw new Error('Invalid or expired token');
    }

    user.lastLogin = new Date();
    user.isEmailVerified = true;
    await user.save();

    // Generate token pair
    const accessToken = tokenService.generateAccessToken(user._id, rememberMe);
    const refreshToken = await tokenService.generateRefreshToken(
      user._id, 
      rememberMe, 
      deviceInfo
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profile: user.profile,
        role: user.role
      }
    };
  }

  async refreshAccessToken(refreshTokenString) {
    const token = await RefreshToken.findOne({ 
      token: refreshTokenString,
      expiresAt: { $gt: new Date() },
      revoked: false
    });
    
    if (!token) {
      throw new Error('Invalid refresh token');
    }

    const user = await User.findById(token.userId);
    
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    const newAccessToken = tokenService.generateAccessToken(user._id);
    
    return {
      accessToken: newAccessToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profile: user.profile,
        role: user.role
      }
    };
  }

  async logout(refreshTokenString) {
    if (refreshTokenString) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshTokenString },
        { revoked: true }
      );
    }
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    
    if (!user) return; // Don't reveal if user exists

    const resetToken = await tokenService.generatePasswordResetToken(user._id);
    await emailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token, newPassword) {
    const resetToken = await tokenService.verifyPasswordResetToken(token);
    
    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    const user = await User.findById(resetToken.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens for security
    await RefreshToken.updateMany(
      { userId: user._id, revoked: false },
      { revoked: true }
    );
  }

  async handleGoogleAuth(profile, deviceInfo = {}) {
    let user = await User.findOne({ 
      $or: [
        { email: profile.email },
        { googleId: profile.id }
      ]
    });

    if (!user) {
      user = await User.create({
        email: profile.email,
        googleId: profile.id,
        username: profile.email.split('@')[0] + Math.floor(Math.random() * 1000),
        profile: { 
          fullname: profile.displayName || profile.name?.givenName,
          avatar: profile.photos?.[0]?.value
        },
        isEmailVerified: true,
        isActive: true
      });
    } else if (!user.googleId) {
      user.googleId = profile.id;
      await user.save();
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = tokenService.generateAccessToken(user._id, true);
    const refreshToken = await tokenService.generateRefreshToken(
      user._id, 
      true, 
      deviceInfo
    );

    return { accessToken, refreshToken, user };
  }
}

module.exports = new AuthService();