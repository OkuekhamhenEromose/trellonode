const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendLoginToken(email, token) {
    const subject = 'Your Trello Login Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0052CC;">Trello Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="background: #F4F5F7; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #172B4D;">
          ${token}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="border: 1px solid #DFE1E6;" />
        <p style="color: #5E6C84; font-size: 12px;">© ${new Date().getFullYear()} Trello, Inc.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: `"Trello" <${process.env.EMAIL_FROM || 'noreply@trello.com'}>`,
      to: email,
      subject,
      html
    });
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0052CC;">Reset Your Trello Password</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <hr style="border: 1px solid #DFE1E6;" />
        <p style="color: #5E6C84; font-size: 12px;">© ${new Date().getFullYear()} Trello, Inc.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: `"Trello" <${process.env.EMAIL_FROM || 'noreply@trello.com'}>`,
      to: email,
      subject: 'Reset your Trello password',
      html
    });
  }

  async sendWelcomeEmail(email, name) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0052CC;">Welcome to Trello, ${name}!</h2>
        <p>We're excited to have you on board. Trello helps you organize everything, from work projects to personal tasks.</p>
        <a href="${process.env.FRONTEND_URL}/boards" style="display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Go to Your Boards
        </a>
        <hr style="border: 1px solid #DFE1E6;" />
        <p style="color: #5E6C84; font-size: 12px;">© ${new Date().getFullYear()} Trello, Inc.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: `"Trello" <${process.env.EMAIL_FROM || 'noreply@trello.com'}>`,
      to: email,
      subject: 'Welcome to Trello!',
      html
    });
  }
}

module.exports = new EmailService();