import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const testSMTP = async () => {
  console.log('\n=== SMTP Configuration Test ===\n');
  
  const config = {
    email: process.env.SMTP_EMAIL,
    password: process.env.SMTP_PASSWORD ? '****' + process.env.SMTP_PASSWORD.slice(-4) : 'NOT SET',
    service: process.env.SMTP_SERVICE,
    nodeEnv: process.env.NODE_ENV
  };
  
  console.log('Configuration loaded:');
  console.log(JSON.stringify(config, null, 2));
  
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log('\n❌ SMTP credentials not set!\n');
    return;
  }

  try {
    console.log('\n1. Creating transporter...');
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    console.log('✅ Transporter created');

    console.log('\n2. Verifying SMTP connection...');
    const verified = await transporter.verify();
    if (verified) {
      console.log('✅ SMTP connection verified - authentication successful!');
    } else {
      console.log('❌ SMTP connection could not be verified');
    }

    console.log('\n3. Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: process.env.SMTP_EMAIL,
      subject: `[TEST] SMTP Configuration Working - ${new Date().toISOString()}`,
      html: `<h2>SMTP Test Successful</h2><p>Your email configuration is working correctly!</p><p>Sent at: ${new Date().toISOString()}</p>`
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    
    console.log('\n=== TEST PASSED ===\n');
  } catch (error) {
    console.error('\n❌ SMTP Test Failed\n');
    console.error('Error:', error.message);
    console.error('\nFull error details:');
    console.error({
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      command: error.command
    });
    
    console.log('\n=== Troubleshooting ===');
    console.log('1. Verify Gmail credentials in backend/.env');
    console.log('2. Use an App Password (not your regular password)');
    console.log('3. Enable 2-factor authentication on Gmail account');
    console.log('4. Check network connectivity to Gmail SMTP server');
    console.log('5. Verify firewall/antivirus is not blocking port 587\n');
  }
};

testSMTP();
