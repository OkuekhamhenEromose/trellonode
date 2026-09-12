const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  // Raw refresh tokens are never persisted. This field contains a SHA-256 digest.
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    select: false,
  },
  familyId: {
    type: String,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RefreshToken",
    default: null,
  },
  userAgent: String,
  ipAddress: String,
  // Kept for a compatibility read path while existing sessions migrate.
  // New tokens must never populate this field.
  token: {
    type: String,
    select: false,
  },
  deviceInfo: {
    ip: String,
    userAgent: String,
    location: String,
  },
  revoked: {
    type: Boolean,
    default: false,
    index: true,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
