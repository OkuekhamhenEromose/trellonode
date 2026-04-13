const nodemailer = require('nodemailer');

// Create transporter with Render-compatible settings
const createTransporter = () => {
  // Try port 465 with SSL (works better on Render)
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER || 'charleschmidth@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'rjjtlkmcarmtwcwx'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false // Required for Render
    }
  });
};

// Alternative transporter for port 587
const createAltTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER || 'charleschmidth@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'rjjtlkmcarmtwcwx'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send verification email with retry logic
exports.sendVerificationEmail = async (email, verificationCode, token) => {
  console.log(`📧 Attempting to send verification email to ${email}...`);
  console.log(`📧 Code: ${verificationCode}, Token: ${token}`);
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Trello Clone" <charleschmidth@gmail.com>',
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
          <p>Or click the link below:</p>
          <p><a href="${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}">Verify Email</a></p>
          <p>This code will expire in 30 minutes.</p>
        </div>
      </body>
      </html>
    `,
    text: `Your verification code is: ${verificationCode}\n\nOr visit: ${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`
  };

  // Try port 465 first
  try {
    const transporter = createTransporter();
    console.log('📧 Trying port 465 with SSL...');
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent via port 465 to ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return info;
  } catch (error465) {
    console.warn('⚠️ Port 465 failed:', error465.message);
    
    // Try port 587 as fallback
    try {
      const altTransporter = createAltTransporter();
      console.log('📧 Trying port 587 with STARTTLS...');
      const info = await altTransporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent via port 587 to ${email}`);
      return info;
    } catch (error587) {
      console.error('❌ Both ports failed. Email could not be sent.');
      console.error('Port 465 error:', error465.message);
      console.error('Port 587 error:', error587.message);
      
      // DON'T throw - return the token so registration can continue
      console.log(`🔑 Verification token for ${email}: ${token}`);
      console.log(`🔑 Verification code: ${verificationCode}`);
      
      // Return a mock success so registration continues
      return { 
        messageId: 'email-failed-but-continuing',
        token: token,
        code: verificationCode 
      };
    }
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (email, fullname) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Trello Clone" <charleschmidth@gmail.com>',
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
        </div>
      `,
    };

    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    // Don't throw - welcome email is not critical
  }
};

// Test connection on startup
(async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email transporter verified successfully on startup');
  } catch (error) {
    console.warn('⚠️ Email transporter verification failed on startup:', error.message);
    console.warn('⚠️ Email sending may not work, but registration will continue');
  }
})();