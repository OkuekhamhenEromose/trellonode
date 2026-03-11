const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");
const Token = require("../models/Token");

class TokenService {
  generateAccessToken(userId, rememberMe = false) {
    const expiresIn = rememberMe ? "30d" : "1d";
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
  }

  async generateRefreshToken(userId, rememberMe = false, deviceInfo = {}) {
    const token = crypto.randomBytes(40).toString("hex");
    const expiresIn = rememberMe ? 30 : 7; // days

    await RefreshToken.create({
      userId,
      token,
      expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
      deviceInfo,
    });

    return token;
  }

  async verifyRefreshToken(token) {
    return await RefreshToken.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });
  }

  async revokeRefreshToken(token) {
    await RefreshToken.deleteOne({ token });
  }

  async revokeAllUserTokens(userId) {
    await RefreshToken.deleteMany({ userId });
  }
  async generateLoginToken(userId) {
    const token = crypto.randomInt(100000, 999999).toString(); // 6-digit code
    console.log(`🔑 Generating login token ${token} for user ${userId}`);

    const tokenDoc = await Token.create({
      userId,
      token,
      type: "login_verification",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    console.log(`✅ Token saved with ID: ${tokenDoc._id}`);
    return token;
  }

  async verifyLoginToken(userId, token) {
    console.log(`🔍 Verifying token ${token} for user ${userId}`);

    const loginToken = await Token.findOneAndUpdate(
      {
        userId,
        token,
        type: "login_verification",
        expiresAt: { $gt: new Date() },
        used: false,
      },
      {
        $set: { used: true },
      },
      { new: true },
    );

    console.log(`🔍 Token found:`, loginToken ? "YES" : "NO");
    return !!loginToken;
  }
  async generatePasswordResetToken(userId) {
    const token = crypto.randomBytes(32).toString("hex");

    await Token.create({
      userId,
      token,
      type: "password_reset",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    return token;
  }

  async verifyPasswordResetToken(token) {
    return await Token.findOneAndUpdate(
      {
        token,
        type: "password_reset",
        expiresAt: { $gt: new Date() },
        used: false,
      },
      {
        $set: { used: true },
      },
      { new: true },
    );
  }
}

module.exports = new TokenService();
