const User = require('../models/User');
const tokenService = require('./tokenService');
const emailService = require('./emailService');

class AuthService {
  async validateEmail(email) {
    const user = await User.findOne({ email });
    return { exists: !!user };
  }

  async authenticatePassword(email, password) {
    const user = await User.findOne({ email }).select('+password');

    // Generic error to prevent enumeration
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.isLocked()) {
      throw new Error('Account temporarily locked');
    }

    const isValid = await user.comparePassword(password);
    
    if (!isValid) {
      await user.incLoginAttempts();
      throw new Error('Invalid credentials');
    }

    // Reset login attempts
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

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
        profile: user.profile,
        role: user.role
      }
    };
  }

  async refreshAccessToken(refreshToken) {
    const token = await tokenService.verifyRefreshToken(refreshToken);
    
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
        profile: user.profile,
        role: user.role
      }
    };
  }

  async logout(refreshToken) {
    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
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
    await tokenService.revokeAllUserTokens(user._id);
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