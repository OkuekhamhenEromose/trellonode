const authService = require("../services/authService");
const googleService = require("../services/googleService");
const tokenService = require("../services/tokenService");
const User = require("../models/User");
const TemporaryRegistration = require("../models/TemporaryRegistration");
const { v4: uuidv4 } = require("uuid");
const { sendVerificationEmail } = require("../utils/email");

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

const getRefreshToken = (req) => {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(/(?:^|;\s*)refreshToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const setRefreshCookie = (res, token, rememberMe = false) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
  });
};

// ==================== LOGIN FLOW CONTROLLERS ====================

exports.loginEmail = async (req, res) => {
  try {
    const { email } = req.body;
    await authService.validateEmail(email);

    // Always return same response for security
    res.json({ nextStep: "password" });
  } catch (error) {
    res.json({ nextStep: "password" }); // Don't reveal errors
  }
};

exports.loginPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.authenticatePassword(email, password);

    res.json({
      nextStep: result.nextStep,
      message: "Verification token sent to your email",
    });
  } catch (error) {
    res.status(401).json({
      error: "Invalid credentials",
      code: "INVALID_CREDENTIALS",
    });
  }
};

exports.loginVerifyToken = async (req, res) => {
  try {
    const { email, token } = req.body;
    const rememberMe = req.body.rememberMe || false;

    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    };

    const result = await authService.verifyLoginToken(
      email,
      token,
      rememberMe,
      deviceInfo,
    );

    setRefreshCookie(res, result.refreshToken, rememberMe);

    res.json({
      accessToken: result.accessToken,
      redirect: "/boards",
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// ==================== TOKEN MANAGEMENT ====================

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: "REFRESH_TOKEN_MISSING",
          message: "Authentication required.",
        },
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    setRefreshCookie(res, result.refreshToken);

    return res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(401).json({
      success: false,
      error: {
        code: "REFRESH_TOKEN_INVALID",
        message: "Authentication required.",
      },
    });
  }
};

// ==================== GOOGLE OAUTH ====================

exports.googleAuth = (req, res) => {
  try {
    const url = googleService.getAuthUrl();
    res.redirect(url);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_init_failed`);
  }
};

exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=no_auth_code`,
      );
    }

    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    };

    const result = await googleService.handleCallback(code, deviceInfo);

    // Set refresh token cookie
    setRefreshCookie(res, result.refreshToken, true);

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/oauth-callback?token=${result.accessToken}`;
    res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

// ==================== PASSWORD MANAGEMENT ====================

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    res.json({
      message:
        "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    res.json({
      message:
        "If an account exists with this email, you will receive a password reset link.",
    });
  }
};

// ==================== GOOGLE MOBILE/SPA LOGIN ====================

exports.googleMobileLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "ID token is required" });
    }

    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    };

    // Verify the token
    const payload = await googleService.verifyToken(idToken);

    const profile = {
      id: payload.sub,
      email: payload.email,
      displayName: payload.name,
      name: {
        givenName: payload.given_name,
        familyName: payload.family_name,
      },
      photos: [{ value: payload.picture }],
    };

    const result = await authService.handleGoogleAuth(profile, deviceInfo);

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user._id,
        email: result.user.email,
        username: result.user.username,
        profile: result.user.profile,
      },
    });
  } catch (error) {
    res.status(401).json({ error: "Google authentication failed" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ==================== EXISTING CONTROLLERS ====================
exports.startRegistration = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email, isActive: true });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "This email is already registered." });
    }

    // Delete any existing temporary registrations
    await TemporaryRegistration.deleteMany({ email });

    // Generate verification code and token
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Create temporary registration
    const tempReg = await TemporaryRegistration.create({
      email,
      verificationCode,
      token,
      expiresAt,
      isVerified: false,
    });

    // Send verification email
    await sendVerificationEmail(email, verificationCode, token);
    res.status(200).json({
      message: "Verification email sent",
      email,
      token: tempReg.token,
      expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: "Email and token are required" });
    }

    // Find temporary registration
    const tempReg = await TemporaryRegistration.findOne({
      email,
      token,
      expiresAt: { $gt: new Date() },
      isVerified: false,
    });

    if (!tempReg) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    }

    // Mark as verified
    tempReg.isVerified = true;
    await tempReg.save();
    res.json({
      message: "Email verified successfully",
      email,
      verified: true,
      token: tempReg.token,
    });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
};

exports.completeRegistration = async (req, res) => {
  try {
    const { email, token, fullname, username, password, password2 } = req.body;
    // Check validation
    if (!email || !token || !fullname || !username || !password || !password2) {
      return res.status(400).json({
        error: "Missing required fields",
        errors: [{ msg: "All fields are required" }],
      });
    }

    if (password !== password2) {
      return res.status(400).json({
        error: "Password validation failed",
        errors: [{ msg: "Passwords do not match" }],
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: "Email already registered",
        errors: [{ msg: "This email is already registered" }],
      });
    }

    // Check username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        error: "Username taken",
        errors: [{ msg: "This username is already taken" }],
      });
    }

    // Verify token
    const tempReg = await TemporaryRegistration.findOne({
      email,
      token,
      expiresAt: { $gt: new Date() },
      isVerified: true,
    });

    if (!tempReg) {
      return res.status(400).json({
        error: "Invalid token",
        errors: [{ msg: "Invalid or expired verification token" }],
      });
    }
    // Create user instance
    const user = new User({
      username,
      email,
      password,
      profile: { fullname },
      isActive: true,
      isEmailVerified: true,
    });

    // Save the user - THIS WILL TRIGGER THE PRE-SAVE MIDDLEWARE
    await user.save();
    // Delete temp registration (don't await - let it run in background)
    TemporaryRegistration.findByIdAndDelete(tempReg._id)
      .then(() => console.log("✅ Temp registration deleted"))
      .catch((err) =>
        console.error("⚠️ Error deleting temp registration:", err),
      );

    // Issue an access token in the response and a refresh token in an HttpOnly cookie.
    const accessToken = tokenService.generateAccessToken(user._id);
    const refreshToken = await tokenService.generateRefreshToken(
      user._id,
      false,
      { ip: req.ip, userAgent: req.get("User-Agent") },
    );
    setRefreshCookie(res, refreshToken, false);
    return res.status(201).json({
      message: "Registration completed successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
      },
      token: accessToken,
    });
  } catch (error) {
    // Check if it's a Mongoose validation error
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation failed",
        errors: Object.values(error.errors).map((e) => ({ msg: e.message })),
      });
    }

    // Check if it's a duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: "Duplicate field",
        errors: [{ msg: `${field} already exists` }],
      });
    }

    res.status(500).json({
      error: "Registration failed",
      message: error.message,
    });
  }
};

// Add or update this function in your authController.js
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email and include password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Legacy direct-login route: preserve compatibility while issuing a secure refresh cookie.
    const token = tokenService.generateAccessToken(user._id);
    const refreshToken = await tokenService.generateRefreshToken(
      user._id,
      false,
      { ip: req.ip, userAgent: req.get("User-Agent") },
    );
    setRefreshCookie(res, refreshToken, false);
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profile: user.profile,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};

// Update the logout function
exports.logout = async (req, res) => {
  try {
    await authService.logout(getRefreshToken(req));
    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logout successful" });
  }
};

// Add a logout from all devices function
exports.logoutAll = async (req, res) => {
  try {
    await authService.logoutAll(req.user._id);
    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logged out from all devices" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "LOGOUT_ALL_FAILED",
        message: "Unable to log out from all devices.",
      },
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profile: user.profile,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get profile" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // ... your existing update profile code
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};

exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const emailExists = await User.exists({ email, isActive: true });

    res.status(200).json({
      email,
      available: !emailExists,
      exists: emailExists,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check email" });
  }
};
