import nodemailer from 'nodemailer';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const smtpConfigured = process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD;

let transporter;

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
} else {
  console.warn('[TRIGGER-EMAIL] ⚠️ SMTP NOT CONFIGURED for trigger notifications');
}

/**
 * Send trigger activation email notification
 */
export const sendTriggerNotificationEmail = async (userEmail, userName, triggerName, notificationEmails = [], customMessage = '') => {
  try {
    const recipients = [userEmail, ...notificationEmails].filter(Boolean);
    
    console.log(`[TRIGGER-EMAIL] Attempting to send trigger notification to ${recipients.join(', ')}`);

    if (!smtpConfigured) {
      console.warn(`[TRIGGER-EMAIL] ⚠️ SMTP not configured. Emails NOT sent.`);
      console.warn('[TRIGGER-EMAIL] Configure in .env: SMTP_EMAIL, SMTP_PASSWORD, SMTP_SERVICE');
      return { success: false, message: 'SMTP not configured', recipients };
    }

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: recipients.join(','),
      subject: `Trigger Activated: ${triggerName} - Digital Legacy Manager`,
      html: `
        <h2>Access Trigger Activated</h2>
        <p>Hi ${userName},</p>
        <p>Your trigger <strong>"${triggerName}"</strong> has been activated.</p>
        ${customMessage ? `<p><strong>Message:</strong> ${customMessage}</p>` : ''}
        <p>Designated beneficiaries and trusted contacts now have access to their designated vault items according to the trigger configuration.</p>
        <p>You can login to Digital Legacy Manager to review the access grants:</p>
        <p><a href="http://localhost:3000">Digital Legacy Manager</a></p>
        <br/>
        <p>Best regards,<br/>Digital Legacy Manager Team</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[TRIGGER-EMAIL] ✅ Notification sent to ${recipients.length} recipient(s). Message ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId, recipientCount: recipients.length };
  } catch (error) {
    console.error('[TRIGGER-EMAIL] ❌ Error sending notification email:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Send trigger webhook
 */
export const sendTriggerWebhook = async (webhookUrl, trigger, triggerData = {}, customHeaders = {}) => {
  try {
    console.log(`[TRIGGER-WEBHOOK] Sending webhook to ${webhookUrl}`);

    const payload = {
      event: 'trigger_activated',
      trigger: {
        id: trigger._id,
        name: trigger.name,
        type: trigger.triggerType,
        activatedAt: new Date(),
        ...triggerData
      },
      timestamp: new Date().toISOString()
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Digital-Legacy-Manager': 'true',
      'X-Trigger-ID': trigger._id.toString(),
      ...customHeaders
    };

    const response = await axios.post(webhookUrl, payload, { 
      headers,
      timeout: 10000
    });

    console.log(`[TRIGGER-WEBHOOK] ✅ Webhook sent successfully. Status: ${response.status}`);
    return { success: true, status: response.status };
  } catch (error) {
    console.error('[TRIGGER-WEBHOOK] ❌ Error sending webhook:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Handle trigger activation - Send all notifications
 */
export const handleTriggerActivation = async (trigger, user, triggerData = {}) => {
  try {
    console.log(`[TRIGGER] Handling activation of trigger: ${trigger.name}`);
    
    const results = {
      email: null,
      webhook: null
    };

    // Send email notification
    if (!trigger.notificationSent) {
      results.email = await sendTriggerNotificationEmail(
        user.email,
        user.firstName || user.username,
        trigger.name,
        trigger.notificationEmails,
        trigger.notificationMessage
      );
    }

    // Send webhook if configured
    if (trigger.webhookEnabled && trigger.webhookUrl) {
      results.webhook = await sendTriggerWebhook(
        trigger.webhookUrl,
        trigger,
        triggerData,
        trigger.webhookHeaders
      );
    }

    console.log(`[TRIGGER] Activation handling completed:`, results);
    return results;
  } catch (error) {
    console.error('[TRIGGER] Error handling trigger activation:', error);
    throw error;
  }
};

export default { 
  sendTriggerNotificationEmail, 
  sendTriggerWebhook, 
  handleTriggerActivation 
};
