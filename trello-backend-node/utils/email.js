const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendVerificationEmail = async (email, verificationCode, token) => {
  console.log(`📧 [Resend] Sending verification email to ${email}...`);
  console.log(`📧 Code: ${verificationCode}, Token: ${token}`);
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Trello Clone <onboarding@resend.dev>',
      to: [email],
      subject: 'Verify Your Email - Trello Clone',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #172b4d; }
            .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(9,30,66,0.15); overflow: hidden; }
            .header { background: linear-gradient(135deg, #0052CC 0%, #2684FF 100%); padding: 30px 20px; text-align: center; }
            .header h2 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #f4f5f7; padding: 20px; text-align: center; border-radius: 8px; color: #0052CC; margin: 20px 0; }
            .btn { display: inline-block; background: #0052CC; color: white !important; padding: 12px 28px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 500; }
            .footer { background: #f4f5f7; padding: 20px 30px; text-align: center; font-size: 12px; color: #5e6c84; }
          </style>
        </head>
        <body style="margin:0;padding:0;background:#f4f5f7;">
          <div class="container">
            <div class="header">
              <h2>🚀 Trello Clone</h2>
            </div>
            <div class="content">
              <h3 style="margin-top:0;">Verify Your Email Address</h3>
              <p>Thanks for signing up! Please verify your email address using the code below:</p>
              <div class="code">${verificationCode}</div>
              <p style="text-align:center;">Or click the button below:</p>
              <p style="text-align:center;">
                <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}" class="btn">
                  Verify Email Now
                </a>
              </p>
              <p style="color:#5e6c84;font-size:13px;">⏰ This code expires in 30 minutes.</p>
            </div>
            <div class="footer">
              <p>If you didn't request this, please ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} Trello Clone</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your verification code is: ${verificationCode}\n\nOr visit: ${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`,
    });

    if (error) {
      throw error;
    }

    console.log(`✅ [Resend] Verification email sent to ${email}`);
    console.log(`📧 Message ID: ${data?.id}`);
    return { success: true, id: data?.id };
    
  } catch (error) {
    console.error('❌ [Resend] Error:', error.message);
    
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
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Trello Clone <onboarding@resend.dev>',
      to: [email],
      subject: 'Welcome to Trello Clone! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #0052CC;">Welcome to Trello Clone!</h2>
          <p>Hello ${fullname || 'there'},</p>
          <p>Your account has been successfully created.</p>
          <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Login to your account
          </a>
        </div>
      `,
    });

    if (error) throw error;
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Welcome email error:', error.message);
    return { success: false };
  }
};

// Test connection on startup
(async () => {
  if (process.env.RESEND_API_KEY) {
    console.log('✅ [Resend] API key found. Email service ready!');
  } else {
    console.warn('⚠️ [Resend] No API key found.');
  }
})();