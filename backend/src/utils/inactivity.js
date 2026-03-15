import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Send inactivity reminder email
 */
export const sendInactivityReminder = async (userEmail, userName, daysInactive) => {
  try {
    console.log(`[INACTIVITY] Sending reminder to ${userEmail} after ${daysInactive} days`);

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: userEmail,
      subject: `Account Inactivity Reminder - Digital Legacy Manager`,
      html: `
        <h2>Account Inactivity Reminder</h2>
        <p>Hi ${userName},</p>
        <p>We noticed that your Digital Legacy Manager account has been inactive for ${daysInactive} days.</p>
        <p>To ensure your account remains secure and to update your digital legacy, we recommend logging in and reviewing your vault.</p>
        <p><strong>Quick Actions:</strong></p>
        <ul>
          <li><a href="http://localhost:3000">Login to Your Account</a></li>
          <li>Update your vault items</li>
          <li>Review your trusted contacts</li>
          <li>Check your access triggers</li>
        </ul>
        <p>If you don't log in within the next 30 days, your configured triggers may activate automatically.</p>
        <br/>
        <p>Best regards,<br/>Digital Legacy Manager Team</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[INACTIVITY] Reminder email sent to ${userEmail}. Message ID: ${result.messageId}`);
    return { success: true, message: 'Inactivity reminder sent', messageId: result.messageId };
  } catch (error) {
    console.error(`[INACTIVITY] Error sending reminder to ${userEmail}:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Check if user is inactive and send reminder
 */
export const checkAndSendInactivityReminder = async (user) => {
  try {
    if (!user.inactivityReminderEnabled) {
      return { sent: false, reason: 'Inactivity reminders disabled for this user' };
    }

    const now = new Date();
    const inactivityThreshold = new Date(now.getTime() - user.inactivityReminderDays * 24 * 60 * 60 * 1000);
    const lastReminder = user.lastInactivityReminderSentAt;
    const reminderCooldown = 7 * 24 * 60 * 60 * 1000; // 7 days between reminders

    // Check if user is inactive
    if (user.lastActivityAt < inactivityThreshold) {
      // Check if we've already sent a reminder recently
      if (lastReminder && now.getTime() - lastReminder.getTime() < reminderCooldown) {
        return { 
          sent: false, 
          reason: 'Reminder already sent recently' 
        };
      }

      const daysInactive = Math.floor((now - user.lastActivityAt) / (1000 * 60 * 60 * 24));
      const emailResult = await sendInactivityReminder(user.email, user.firstName || user.username, daysInactive);

      if (emailResult.success) {
        user.lastInactivityReminderSentAt = now;
        await user.save();
        return { sent: true, daysInactive };
      } else {
        return { sent: false, reason: 'Failed to send email', error: emailResult.message };
      }
    }

    return { sent: false, reason: 'User is still active' };
  } catch (error) {
    console.error('[INACTIVITY] Error checking inactivity:', error);
    return { sent: false, reason: 'Error checking inactivity', error: error.message };
  }
};

export default { sendInactivityReminder, checkAndSendInactivityReminder };
