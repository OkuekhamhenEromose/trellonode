const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send verification email
exports.sendVerificationEmail = async (email, verificationCode, token) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email - Trello Clone',
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>Or click the link below to verify your email:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}">Verify Email</a>
        <p>This code will expire in 30 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (email, fullname) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to Trello Clone!',
      html: `
        <h1>Welcome ${fullname || 'to Trello Clone'}!</h1>
        <p>Your account has been successfully created.</p>
        <p>Start organizing your projects today!</p>
        <a href="${process.env.FRONTEND_URL}/login">Login to your account</a>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
};