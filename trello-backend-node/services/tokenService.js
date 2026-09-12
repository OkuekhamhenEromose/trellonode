const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const Token = require('../models/Token');
const { secret, accessExpiration, refreshExpiration, issuer, audience } = require('../config/jwt');

const parseDays = (value, fallback) => {
  const match = String(value || '').match(/^(\d+)d$/i);
  return match ? Number(match[1]) : fallback;
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(token, 'utf8').digest('hex');

const publicUser = (user) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  profile: user.profile,
  role: user.role,
});

class TokenService {
  generateAccessToken(userId) {
    return jwt.sign(
      { userId: String(userId), type: 'access' },
      secret,
      {
        expiresIn: accessExpiration,
        issuer,
        audience,
      },
    );
  }

  async generateRefreshToken(userId, rememberMe = false, deviceInfo = {}, familyId = crypto.randomUUID()) {
    const rawToken = crypto.randomBytes(48).toString('base64url');
    const days = rememberMe ? 30 : parseDays(refreshExpiration, 7);
    const now = new Date();

    await RefreshToken.create({
      userId,
      tokenHash: hashToken(rawToken),
      familyId,
      expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ip,
      deviceInfo,
      revoked: false,
    });

    return rawToken;
  }

  async rotateRefreshToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    const existing = await RefreshToken.findOne({ tokenHash }).select('+token');

    if (!existing) {
      // Compatibility path for sessions created before hash-only storage.
      const legacy = await RefreshToken.findOne({ token: rawToken });
      if (!legacy) throw new Error('Invalid refresh token');
      return this._rotateStoredToken(legacy);
    }

    if (existing.revoked) {
      await this.revokeTokenFamily(existing.familyId);
      throw new Error('Refresh token reuse detected');
    }

    if (existing.expiresAt <= new Date()) {
      await this.revokeToken(existing);
      throw new Error('Invalid refresh token');
    }

    return this._rotateStoredToken(existing);
  }

  async _rotateStoredToken(existing) {
    const claimed = await RefreshToken.findOneAndUpdate(
      { _id: existing._id, revoked: false, expiresAt: { $gt: new Date() } },
      { $set: { revoked: true, revokedAt: new Date() } },
      { new: true },
    );

    if (!claimed) {
      await this.revokeTokenFamily(existing.familyId);
      throw new Error('Refresh token reuse detected');
    }

    const rawReplacement = crypto.randomBytes(48).toString('base64url');
    const replacement = await RefreshToken.create({
      userId: existing.userId,
      tokenHash: hashToken(rawReplacement),
      familyId: existing.familyId,
      expiresAt: existing.expiresAt,
      userAgent: existing.userAgent,
      ipAddress: existing.ipAddress,
      deviceInfo: existing.deviceInfo,
      revoked: false,
    });

    claimed.replacedBy = replacement._id;
    await claimed.save();

    return {
      refreshToken: rawReplacement,
      userId: existing.userId,
      familyId: existing.familyId,
    };
  }

  async verifyRefreshToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    return RefreshToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
      revoked: false,
    });
  }

  async revokeToken(tokenDoc) {
    if (!tokenDoc) return;
    await RefreshToken.updateOne(
      { _id: tokenDoc._id, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } },
    );
  }

  async revokeRefreshToken(rawToken) {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    await RefreshToken.updateOne(
      { tokenHash, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } },
    );
  }

  async revokeTokenFamily(familyId) {
    if (!familyId) return;
    await RefreshToken.updateMany(
      { familyId, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } },
    );
  }

  async revokeAllUserTokens(userId) {
    await RefreshToken.updateMany(
      { userId, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } },
    );
  }

  async generateLoginToken(userId) {
    const token = crypto.randomInt(100000, 1000000).toString();
    await Token.create({
      userId,
      token,
      type: 'login_verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return token;
  }

  async verifyLoginToken(userId, token) {
    const loginToken = await Token.findOneAndUpdate(
      {
        userId,
        token,
        type: 'login_verification',
        expiresAt: { $gt: new Date() },
        used: false,
      },
      { $set: { used: true } },
      { new: true },
    );
    return !!loginToken;
  }

  async generatePasswordResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    await Token.create({
      userId,
      token,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    return token;
  }

  async verifyPasswordResetToken(token) {
    return Token.findOneAndUpdate(
      {
        token,
        type: 'password_reset',
        expiresAt: { $gt: new Date() },
        used: false,
      },
      { $set: { used: true } },
      { new: true },
    );
  }

  hashToken(token) {
    return hashToken(token);
  }

  publicUser(user) {
    return publicUser(user);
  }
}

module.exports = new TokenService();
