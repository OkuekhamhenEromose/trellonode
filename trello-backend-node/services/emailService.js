const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
});

class EmailService {
  async sendLoginToken(email, token) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Trello Login Verification Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #0052cc; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <rect x="3" y="3" width="8" height="18" rx="1.5"/>
                <rect x="13" y="3" width="8" height="12" rx="1.5"/>
              </svg>
            </div>
            <h1 style="color: #172b4d; font-size: 24px; margin: 0;">Trello</h1>
          </div>
          
          <h2 style="color: #172b4d; font-size: 18px; margin-bottom: 16px;">Login Verification Code</h2>
          
          <p style="color: #5e6c84; margin-bottom: 24px;">Use the following code to complete your login:</p>
          
          <div style="background: #f4f5f7; padding: 24px; text-align: center; border-radius: 8px; margin-bottom: 24px;">
            <h1 style="color: #172b4d; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${token}</h1>
          </div>
          
          <p style="color: #5e6c84; font-size: 14px; margin-bottom: 8px;">This code will expire in 10 minutes.</p>
          
          <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 24px 0;">
          
          <p style="color: #a5adba; font-size: 12px;">
            If you didn't request this code, someone may be trying to access your account. 
            Please ignore this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email, token) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset your Trello password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #0052cc; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <rect x="3" y="3" width="8" height="18" rx="1.5"/>
                <rect x="13" y="3" width="8" height="12" rx="1.5"/>
              </svg>
            </div>
            <h1 style="color: #172b4d; font-size: 24px; margin: 0;">Trello</h1>
          </div>
          
          <h2 style="color: #172b4d; font-size: 18px; margin-bottom: 16px;">Reset Your Password</h2>
          
          <p style="color: #5e6c84; margin-bottom: 24px;">Click the button below to reset your password. This link will expire in 1 hour.</p>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetLink}" 
               style="display: inline-block; background: #0052cc; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; font-weight: 500;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #5e6c84; font-size: 14px; margin-bottom: 8px;">Or copy this link:</p>
          <div style="background: #f4f5f7; padding: 12px; border-radius: 4px; margin-bottom: 24px;">
            <p style="color: #172b4d; font-size: 12px; word-break: break-all; margin: 0;">
              <a href="${resetLink}" style="color: #0052cc;">${resetLink}</a>
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 24px 0;">
          
          <p style="color: #a5adba; font-size: 12px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();