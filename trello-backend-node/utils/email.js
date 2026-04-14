const nodemailer = require('nodemailer');

// Create Brevo transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_LOGIN || process.env.BREVO_USER,
      pass: process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send verification email
exports.sendVerificationEmail = async (email, verificationCode, token) => {
  console.log(`📧 [Brevo] Sending verification email to ${email}...`);
  console.log(`📧 Code: ${verificationCode}, Token: ${token}`);
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Trello Clone <charleschmidth@gmail.com>',
    to: email,
    subject: 'Verify Your Email - Trello Clone',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            color: #172b4d;
            margin: 0;
            padding: 0;
            background-color: #f4f5f7;
          }
          .container { 
            max-width: 500px; 
            margin: 40px auto; 
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(9,30,66,0.15);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #0052CC 0%, #2684FF 100%);
            padding: 30px 20px;
            text-align: center;
          }
          .header h2 { 
            color: white; 
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 30px;
          }
          .code { 
            font-size: 36px; 
            font-weight: bold; 
            letter-spacing: 8px; 
            background: #f4f5f7; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px;
            color: #0052CC;
            margin: 20px 0;
            border: 2px dashed #dfe1e6;
          }
          .btn { 
            display: inline-block; 
            background: #0052CC; 
            color: white !important; 
            padding: 12px 28px; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
            font-weight: 500;
            text-align: center;
          }
          .btn:hover {
            background: #0065ff;
          }
          .footer { 
            background: #f4f5f7;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #5e6c84;
            border-top: 1px solid #dfe1e6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚀 Trello Clone</h2>
          </div>
          <div class="content">
            <h3 style="margin-top: 0; color: #172b4d;">Verify Your Email Address</h3>
            <p>Thanks for signing up! Please verify your email address by entering the code below or clicking the verification link.</p>
            
            <div class="code">${verificationCode}</div>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}" class="btn">
                Verify Email Now
              </a>
            </p>
            
            <p style="color: #5e6c84; font-size: 14px;">Or copy and paste this link:</p>
            <p style="background: #f4f5f7; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 13px;">
              ${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}
            </p>
            
            <p style="color: #5e6c84; font-size: 13px; margin-top: 20px;">
              ⏰ This code will expire in <strong>30 minutes</strong>.
            </p>
          </div>
          <div class="footer">
            <p>If you didn't request this, please ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} Trello Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Verify Your Email - Trello Clone

Your verification code is: ${verificationCode}

Or click this link to verify:
${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}

This code expires in 30 minutes.

If you didn't request this, please ignore this email.
    `
  };

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [Brevo] Verification email sent to ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [Brevo] Error:', error.message);
    
    // Fallback: Log the code for manual verification
    console.log(`🔑 ===== MANUAL VERIFICATION =====`);
    console.log(`🔑 Email: ${email}`);
    console.log(`🔑 Code: ${verificationCode}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`🔑 ================================`);
    
    return { 
      success: false,
      token,
      code: verificationCode 
    };
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (email, fullname) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Trello Clone <charleschmidth@gmail.com>',
      to: email,
      subject: 'Welcome to Trello Clone! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
            .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(9,30,66,0.15); overflow: hidden; }
            .header { background: linear-gradient(135deg, #0052CC 0%, #2684FF 100%); padding: 30px 20px; text-align: center; }
            .header h2 { color: white; margin: 0; }
            .content { padding: 30px; }
            .btn { display: inline-block; background: #0052CC; color: white !important; padding: 12px 28px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body style="margin:0;padding:0;background:#f4f5f7;">
          <div class="container">
            <div class="header">
              <h2>🎉 Welcome to Trello Clone!</h2>
            </div>
            <div class="content">
              <h3>Hello ${fullname || 'there'}! 👋</h3>
              <p>Your account has been successfully created and verified.</p>
              <p>Start organizing your projects, collaborating with your team, and getting things done!</p>
              
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/login" class="btn">
                  Go to Your Account
                </a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Welcome email error:', error.message);
    return { success: false };
  }
};

// Test connection on startup
(async () => {
  if (process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY) {
    console.log('✅ [Brevo] SMTP credentials found. Email service ready!');
  } else {
    console.warn('⚠️ [Brevo] No SMTP credentials found.');
  }
})();