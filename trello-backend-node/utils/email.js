const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// SendGrid configuration
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendVerificationEmail = async (email, verificationCode, token) => {
  console.log(`📧 Sending verification email to ${email} via SendGrid...`);
  
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'charleschmidth@gmail.com',
    subject: 'Verify Your Email - Trello Clone',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #f4f5f7; padding: 20px; text-align: center; border-radius: 8px; }
          .btn { display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="color: #0052CC;">Trello Clone</h2>
          <h3>Verify Your Email</h3>
          <p>Your verification code is:</p>
          <div class="code">${verificationCode}</div>
          <p>Or click the button below:</p>
          <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}" class="btn">
            Verify Email
          </a>
          <p>This code expires in 30 minutes.</p>
        </div>
      </body>
      </html>
    `,
    text: `Your verification code is: ${verificationCode}\n\nOr visit: ${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Verification email sent to ${email} via SendGrid`);
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid error:', error.response?.body || error.message);
    
    // Fallback: Log the code for testing
    console.log(`🔑 Verification code for ${email}: ${verificationCode}`);
    console.log(`🔑 Verification token: ${token}`);
    
    return { 
      success: false,
      token,
      code: verificationCode 
    };
  }
};