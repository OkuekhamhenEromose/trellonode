const nodemailer = require('nodemailer');

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // false for 587, true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Add timeout to prevent hanging
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error.message);
  } else {
    console.log('✅ Email transporter ready to send emails');
  }
});

// Send verification email
exports.sendVerificationEmail = async (email, verificationCode, token) => {
  try {
    console.log(`📧 Attempting to send verification email to ${email}...`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Trello Clone" <noreply@trello.com>',
      to: email,
      subject: 'Verify Your Email - Trello Clone',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #f4f5f7; padding: 20px; text-align: center; border-radius: 8px; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="color: #0052CC;">Trello Clone</h2>
            </div>
            <h3>Email Verification</h3>
            <p>Your verification code is:</p>
            <div class="code">${verificationCode}</div>
            <p>Or click the link below to verify your email:</p>
            <p><a href="${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}">Verify Email</a></p>
            <p>This code will expire in 30 minutes.</p>
            <div class="footer">
              <p>If you didn't request this, please ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} Trello Clone</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your verification code is: ${verificationCode}\n\nOr visit: ${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}\n\nThis code expires in 30 minutes.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending verification email:', error.message);
    throw error;
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (email, fullname) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Trello Clone" <noreply@trello.com>',
      to: email,
      subject: 'Welcome to Trello Clone!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #0052CC;">Welcome to Trello Clone!</h2>
          <p>Hello ${fullname || 'there'},</p>
          <p>Your account has been successfully created.</p>
          <p>Start organizing your projects today!</p>
          <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Login to your account
          </a>
          <p style="font-size: 12px; color: #666;">&copy; ${new Date().getFullYear()} Trello Clone</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
  }
};