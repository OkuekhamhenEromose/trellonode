const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    console.log('📧 Initializing EmailService with working Gmail configuration...');
    
    // Use EXACTLY the same config that worked in your test
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'charleschmidth@gmail.com',
        pass: 'rjjtlkmcarmtwcwx' // Your App Password
      }
    });
    
    // Verify on startup
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email connection verified successfully');
    } catch (error) {
      console.error('❌ Email connection failed:', error.message);
    }
  }

  async sendLoginToken(email, token) {
    console.log('📧 ===== SENDING LOGIN TOKEN =====');
    console.log('📧 To:', email);
    console.log('📧 Token:', token);
    
    const mailOptions = {
      from: '"Trello Test" <charleschmidth@gmail.com>', // Use the same from as your test
      to: email,
      subject: `🔐 Your Trello login code: ${token}`,
      text: `Your Trello login verification code is: ${token}\n\nThis code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0052CC;">Trello Login Verification</h2>
          <p>Your login verification code is:</p>
          <div style="background: #F4F5F7; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #0052CC; border-radius: 8px;">
            ${token}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    try {
      console.log('📧 Sending email via Gmail...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ LOGIN TOKEN EMAIL SENT SUCCESSFULLY!');
      console.log('📧 Message ID:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Failed to send login token email:');
      console.error('❌ Error:', error.message);
      throw error;
    }
  }

  async sendVerificationEmail(email, verificationCode, token) {
    console.log(`📧 Sending verification email to ${email}...`);
    
    const mailOptions = {
      from: '"Trello Test" <charleschmidth@gmail.com>',
      to: email,
      subject: 'Verify Your Email - Trello Clone',
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>This code will expire in 30 minutes.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();