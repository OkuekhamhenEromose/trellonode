const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Email Verification Token Schema ─────────────────────────────────────────
const emailVerificationTokenSchema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token:     { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    isUsed:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Temporary Registration Schema ───────────────────────────────────────────
const temporaryRegistrationSchema = new mongoose.Schema(
  {
    email:            { type: String, required: true, unique: true },
    verificationCode: { type: String },
    token:            { type: String, required: true, unique: true },
    expiresAt:        { type: Date, required: true },
    isVerified:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── User Schema ──────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName:     { type: String, trim: true },
    lastName:      { type: String, trim: true },
    emailVerified: { type: Boolean, default: false },
    profile: {
      fullname: { type: String, trim: true },
      phone:    { type: String, trim: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
// Mongoose 9.x resolves async pre-hooks via the returned Promise.
// DO NOT pass `next` as a parameter — that is what caused "next is not a function"
// in every previous attempt (mixing async + next corrupts the middleware chain).
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// ─── Instance Methods ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Virtuals ─────────────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return (
    this.profile?.fullname ||
    `${this.firstName || ''} ${this.lastName || ''}`.trim()
  );
});

// ─── Models ───────────────────────────────────────────────────────────────────
const User                  = mongoose.model('User', userSchema);
const EmailVerificationToken = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);
const TemporaryRegistration  = mongoose.model('TemporaryRegistration', temporaryRegistrationSchema);

module.exports = { User, EmailVerificationToken, TemporaryRegistration };