const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, TemporaryRegistration, EmailVerificationToken } = require('../models/User');
const { sendVerificationEmail, sendWelcomeEmail }             = require('../utils/email');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// ─── Start Registration ───────────────────────────────────────────────────────
exports.startRegistration = async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email, isActive: true });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }

    // Remove any previous incomplete registrations for this email
    await TemporaryRegistration.deleteMany({ email });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const token            = uuidv4();
    const expiresAt        = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    const tempReg = await TemporaryRegistration.create({
      email,
      verificationCode,
      token,
      expiresAt,
      isVerified: false,
    });

    await sendVerificationEmail(email, verificationCode, token);

    res.status(200).json({
      message:   'Verification email sent',
      email,
      token:     tempReg.token,
      expiresAt,
    });
  } catch (error) {
    console.error('Start registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode, token } = req.body;

    const tempReg = await TemporaryRegistration.findOne({
      email,
      expiresAt: { $gt: new Date() },
    });

    if (!tempReg) {
      return res.status(400).json({ error: 'Verification expired or invalid.' });
    }

    if (verificationCode && tempReg.verificationCode !== verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (token && tempReg.token !== token) {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }

    tempReg.isVerified = true;
    await tempReg.save();

    res.status(200).json({
      message:  'Email verified successfully',
      email,
      verified: true,
      token:    tempReg.token,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

// ─── Complete Registration ────────────────────────────────────────────────────
exports.completeRegistration = async (req, res) => {
  try {
    const { email, token, fullname, username, password, password2 } = req.body;

    console.log('📝 Complete registration request:', {
      email,
      username,
      token:          token?.substring(0, 8) + '...',
      passwordLength: password?.length,
    });

    // ── 1. Basic validation ──────────────────────────────────────────────────
    if (!email || !token || !fullname || !username || !password || !password2) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password !== password2) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // ── 2. Verify temp registration FIRST ───────────────────────────────────
    // Do this before the duplicate-user check so we can distinguish an
    // orphaned user (crashed previous attempt) from a genuine duplicate.
    const tempReg = await TemporaryRegistration.findOne({
      email,
      token,
      expiresAt:  { $gt: new Date() },
      isVerified: true,
    });

    if (!tempReg) {
      console.log('❌ Invalid or expired verification token');
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    console.log('✅ Temp registration found and verified');

    // ── 3. Handle potential orphaned user ────────────────────────────────────
    // If the server crashed after User.create() but before sending the response,
    // a user record exists in the DB but the client never got the JWT.
    // Since the temp registration is still valid, we treat this as a retry
    // and clean up the orphaned record.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('🔄 Orphaned user detected — cleaning up for retry:', email);
      await EmailVerificationToken.deleteMany({ user: existingUser._id });
      await User.deleteOne({ _id: existingUser._id });
    }

    // ── 4. Username uniqueness check ─────────────────────────────────────────
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log('❌ Username already taken:', username);
      return res.status(400).json({ error: 'This username is already taken.' });
    }

    // ── 5. Create user ───────────────────────────────────────────────────────
    // Password hashing is handled by the Mongoose pre-save hook in User.js.
    const user = await User.create({
      username,
      email,
      password,
      profile:  { fullname },
      isActive: true,
    });

    console.log('✅ User created successfully:', user._id);

    // ── 6. Create email verification token ──────────────────────────────────
    await EmailVerificationToken.create({
      user:      user._id,
      token:     uuidv4(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h
    });

    // ── 7. Delete temp registration ──────────────────────────────────────────
    await TemporaryRegistration.findByIdAndDelete(tempReg._id);

    // ── 8. Send welcome email (non-fatal) ────────────────────────────────────
    try {
      await sendWelcomeEmail(email, fullname);
    } catch (emailError) {
      console.error('❌ Welcome email failed (non-fatal):', emailError.message);
    }

    // ── 9. Generate JWT and respond ──────────────────────────────────────────
    const accessToken = generateToken(user._id);

    console.log('✅ Registration complete — sending 201');

    return res.status(201).json({
      message: 'Registration completed successfully',
      user: {
        id:       user._id,
        username: user.username,
        email:    user.email,
        profile:  user.profile,
      },
      token: accessToken,
    });

  } catch (error) {
    console.error('❌ Complete registration error:', error);
    return res.status(500).json({
      error:   'Registration completion failed',
      details: error.message,
    });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email && !username) {
      return res.status(400).json({ error: 'Email or username is required.' });
    }

    const user = email
      ? await User.findOne({ email })
      : await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled.' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id:       user._id,
        username: user.username,
        email:    user.email,
        profile:  user.profile,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = async (_req, res) => {
  // JWT is stateless — client discards the token
  res.status(200).json({ message: 'Logout successful' });
};

// ─── Get Profile ──────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({
      user: {
        id:        user._id,
        username:  user.username,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        profile:   user.profile,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};
    if (req.body.fullname)   updates['profile.fullname'] = req.body.fullname;
    if (req.body.phone)      updates['profile.phone']    = req.body.phone;
    if (req.body.firstName)  updates.firstName           = req.body.firstName;
    if (req.body.lastName)   updates.lastName            = req.body.lastName;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id:        user._id,
        username:  user.username,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        profile:   user.profile,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ─── Check Email ──────────────────────────────────────────────────────────────
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const exists = await User.exists({ email, isActive: true });

    return res.status(200).json({
      email,
      available: !exists,
      exists:    !!exists,
    });
  } catch (error) {
    console.error('Check email error:', error);
    return res.status(500).json({ error: 'Failed to check email' });
  }
};