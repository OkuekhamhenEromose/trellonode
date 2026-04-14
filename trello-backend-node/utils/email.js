const brevo = require('@getbrevo/brevo');

// Initialize Brevo API client
const defaultClient = brevo.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new brevo.TransactionalEmailsApi();

// Send verification email using Brevo API (HTTPS)
exports.sendVerificationEmail = async (email, verificationCode, token) => {
  console.log(`📧 [Brevo API] Sending verification email to ${email}...`);
  console.log(`📧 Code: ${verificationCode}, Token: ${token}`);
  
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = 'Verify Your Email - Trello Clone';
  sendSmtpEmail.htmlContent = `
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
          <p>Thanks for signing up! Please verify your email address using the code below:</p>
          
          <div class="code">${verificationCode}</div>
          
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}" class="btn">
              Verify Email Now
            </a>
          </p>
          
          <p style="color: #5e6c84; font-size: 13px; margin-top: 20px;">
            ⏰ This code will expire in <strong>30 minutes</strong>.
          </p>
        </div>
        <div class="footer">
          <p>If you didn't request this, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} Trello Clone</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  sendSmtpEmail.textContent = `
Verify Your Email - Trello Clone

Your verification code is: ${verificationCode}

Or visit: ${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}

This code expires in 30 minutes.
  `;
  
  sendSmtpEmail.sender = { 
    name: 'Trello Clone', 
    email: 'charleschmidth@gmail.com' 
  };
  sendSmtpEmail.to = [{ email: email }];

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ [Brevo API] Verification email sent to ${email}`);
    console.log(`📧 Message ID: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('❌ [Brevo API] Error:', error.message);
    if (error.response) {
      console.error('Response body:', JSON.stringify(error.response.body, null, 2));
    }
    
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
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = 'Welcome to Trello Clone! 🎉';
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0052CC;">Welcome to Trello Clone!</h2>
        <p>Hello ${fullname || 'there'},</p>
        <p>Your account has been successfully created and verified.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Login to your account
        </a>
      </div>
    `;
    sendSmtpEmail.sender = { 
      name: 'Trello Clone', 
      email: 'charleschmidth@gmail.com' 
    };
    sendSmtpEmail.to = [{ email: email }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Welcome email error:', error.message);
    return { success: false };
  }
};

// Test connection on startup
(async () => {
  if (process.env.BREVO_API_KEY) {
    console.log('✅ [Brevo API] API key found. Email service ready!');
  } else {
    console.warn('⚠️ [Brevo API] No API key found.');
  }
})();