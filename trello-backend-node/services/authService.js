const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const tokenService = require("./tokenService");
const emailService = require("./emailService");

class AuthService {
  async validateEmail(email) {
    const user = await User.findOne({ email });
    return { exists: !!user };
  }

  async authenticatePassword(email, password) {
    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.isActive) {
      throw new Error("Invalid credentials");
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const loginToken = await tokenService.generateLoginToken(user._id);
    await emailService.sendLoginToken(email, loginToken);

    return { nextStep: "token-verification", userId: user._id };
  }

  async verifyLoginToken(email, token, rememberMe = false, deviceInfo = {}) {
    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      throw new Error("Invalid token");
    }

    const isValid = await tokenService.verifyLoginToken(user._id, token);
    if (!isValid) {
      throw new Error("Invalid or expired token");
    }

    user.lastLogin = new Date();
    user.isEmailVerified = true;
    await user.save();

    const accessToken = tokenService.generateAccessToken(user._id, rememberMe);
    const refreshToken = await tokenService.generateRefreshToken(
      user._id,
      rememberMe,
      deviceInfo,
    );

    return {
      accessToken,
      refreshToken,
      user: tokenService.publicUser(user),
    };
  }

  async refreshAccessToken(refreshTokenString) {
    const rotated = await tokenService.rotateRefreshToken(refreshTokenString);
    const user = await User.findById(rotated.userId);

    if (!user || !user.isActive) {
      await tokenService.revokeTokenFamily(rotated.familyId);
      throw new Error("User not found or inactive");
    }

    return {
      accessToken: tokenService.generateAccessToken(user._id),
      refreshToken: rotated.refreshToken,
      user: tokenService.publicUser(user),
    };
  }

  async logout(refreshTokenString) {
    if (refreshTokenString) {
      await tokenService.revokeRefreshToken(refreshTokenString);
    }
  }

  async logoutAll(userId) {
    await tokenService.revokeAllUserTokens(userId);
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user || !user.isActive) return;

    const resetToken = await tokenService.generatePasswordResetToken(user._id);
    await emailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token, newPassword) {
    const resetToken = await tokenService.verifyPasswordResetToken(token);
    if (!resetToken) throw new Error("Invalid or expired reset token");

    const user = await User.findById(resetToken.userId);
    if (!user) throw new Error("User not found");

    user.password = newPassword;
    await user.save();
    await this.logoutAll(user._id);
  }

  async handleGoogleAuth(profile, deviceInfo = {}) {
    let user = await User.findOne({
      $or: [{ email: profile.email }, { googleId: profile.id }],
    });

    if (!user) {
      const baseUsername =
        profile.email
          .split("@")[0]
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .slice(0, 25) || "user";
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`.slice(0, 30);
        counter += 1;
      }

      user = await User.create({
        email: profile.email,
        googleId: profile.id,
        username,
        profile: {
          fullname: profile.displayName || profile.name?.givenName || "",
          avatar: profile.photos?.[0]?.value || "",
        },
        isEmailVerified: true,
        isActive: true,
      });
    } else if (!user.googleId) {
      user.googleId = profile.id;
      user.isEmailVerified = true;
    }

    if (!user.isActive) throw new Error("Account is inactive");

    user.lastLogin = new Date();
    await user.save();

    const accessToken = tokenService.generateAccessToken(user._id, true);
    const refreshToken = await tokenService.generateRefreshToken(
      user._id,
      true,
      deviceInfo,
    );

    return {
      accessToken,
      refreshToken,
      user: tokenService.publicUser(user),
    };
  }
}

module.exports = new AuthService();
