import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { sendAccessGrantedEmail } from '../utils/email.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Test email endpoint - sends a test email to verify SMTP configuration
router.post('/test-email', authMiddleware, async (req, res) => {
  try {
    const { testEmail } = req.body;
    const recipientEmail = testEmail || process.env.SMTP_EMAIL; // Send to self if no email provided

    console.log(`[TEST-EMAIL] Attempting to send test email to: ${recipientEmail}`);

    // Check SMTP configuration
    const smtpConfigured = process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD;
    
    if (!smtpConfigured) {
      return res.status(500).json({
        success: false,
        message: 'SMTP not configured. Set SMTP_EMAIL, SMTP_PASSWORD, SMTP_SERVICE in backend/.env',
        config: {
          SMTP_EMAIL: process.env.SMTP_EMAIL || 'NOT SET',
          SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '****' + process.env.SMTP_PASSWORD.slice(-4) : 'NOT SET',
          SMTP_SERVICE: process.env.SMTP_SERVICE || 'NOT SET'
        }
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('[TEST-EMAIL] ✅ SMTP connection verified');

    // Send test email
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: recipientEmail,
      subject: 'Test Email - Digital Legacy Manager',
      html: `
        <h2>Test Email Successful</h2>
        <p>This is a test email from Digital Legacy Manager.</p>
        <p>Your SMTP configuration is working correctly!</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Service: ${process.env.SMTP_SERVICE}</li>
          <li>From: ${process.env.SMTP_EMAIL}</li>
          <li>To: ${recipientEmail}</li>
          <li>Sent at: ${new Date().toISOString()}</li>
        </ul>
        <p>Best regards,<br/>Digital Legacy Manager</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log(`[TEST-EMAIL] ✅ Test email sent successfully. Message ID: ${result.messageId}`);

    res.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        messageId: result.messageId,
        recipient: recipientEmail,
        from: process.env.SMTP_EMAIL,
        service: process.env.SMTP_SERVICE,
        sentAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[TEST-EMAIL] ❌ Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
      details: error.toString()
    });
  }
});

// Test beneficiary access email
router.post('/test-beneficiary-email', authMiddleware, async (req, res) => {
  try {
    const { beneficiaryEmail, beneficiaryName } = req.body;

    if (!beneficiaryEmail) {
      return res.status(400).json({
        success: false,
        message: 'beneficiaryEmail is required'
      });
    }

    console.log(`[TEST-BENEFICIARY] Sending access granted email to: ${beneficiaryEmail}`);

    const result = await sendAccessGrantedEmail(
      { email: beneficiaryEmail, name: beneficiaryName || 'Test Beneficiary' },
      beneficiaryName || 'Test Beneficiary',
      'Test Owner'
    );

    res.json({
      success: result.success,
      message: result.message,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('[TEST-BENEFICIARY] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
