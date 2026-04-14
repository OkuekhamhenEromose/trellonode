const axios = require('axios');

class EmailService {
  constructor() {
    console.log('📧 Initializing EmailService with Brevo API...');
    
    if (process.env.BREVO_API_KEY) {
      console.log('✅ [EmailService] Brevo API key found. Ready!');
    } else {
      console.warn('⚠️ [EmailService] No Brevo API key found.');
    }
  }

  async verifyConnection() {
    // Brevo API doesn't need connection verification
    console.log('✅ Email service ready (Brevo API)');
    return true;
  }

  async sendLoginToken(email, token) {
    console.log('📧 ===== SENDING LOGIN TOKEN VIA BREVO =====');
    console.log('📧 To:', email);
    console.log('📧 Token:', token);
    
    const emailData = {
      sender: { 
        name: 'Trello Clone', 
        email: 'charleschmidth@gmail.com' 
      },
      to: [{ email: email }],
      subject: `🔐 Your Trello login code: ${token}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0052CC;">Trello Login Verification</h2>
          <p>Your login verification code is:</p>
          <div style="background: #F4F5F7; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #0052CC; border-radius: 8px;">
            ${token}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      textContent: `Your Trello login verification code is: ${token}\n\nThis code will expire in 10 minutes.`
    };

    try {
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('✅ LOGIN TOKEN EMAIL SENT SUCCESSFULLY!');
      console.log('📧 Message ID:', response.data.messageId);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send login token email:');
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Error:', error.response?.data || error.message);
      
      // Still log the token for testing
      console.log(`🔑 Login token for ${email}: ${token}`);
      throw error;
    }
  }

  async sendVerificationEmail(email, verificationCode, token) {
    console.log(`📧 [EmailService] Sending verification email to ${email}...`);
    
    const emailData = {
      sender: { 
        name: 'Trello Clone', 
        email: 'charleschmidth@gmail.com' 
      },
      to: [{ email: email }],
      subject: 'Verify Your Email - Trello Clone',
      htmlContent: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>Or click the link below:</p>
        <p><a href="${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}">Verify Email</a></p>
        <p>This code will expire in 30 minutes.</p>
      `,
      textContent: `Your verification code is: ${verificationCode}\n\nOr visit: ${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`
    };

    try {
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Verification email sent: ${response.data.messageId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending verification email:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new EmailService();