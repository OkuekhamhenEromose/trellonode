const nodemailer = require('nodemailer');

async function sendTestEmail() {
  console.log('🔧 Testing email sending...');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'charleschmidth@gmail.com',
      pass: 'rjjtlkmcarmtwcwx' // Your App Password
    }
  });

  try {
    // Test connection
    await transporter.verify();
    console.log('✅ Connection verified');

    // Send test email
    const info = await transporter.sendMail({
      from: '"Trello Test" <charleschmidth@gmail.com>',
      to: 'trellobackendnode@gmail.com',
      subject: 'Test Email from Trello Backend',
      text: 'If you receive this, email is working!',
      html: '<h1>Test Email</h1><p>Email service is working correctly!</p>'
    });

    console.log('✅ Test email sent!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

sendTestEmail();