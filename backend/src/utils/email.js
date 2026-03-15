import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { ensureBeneficiaryInviteToken } from './beneficiaryInvite.js';

dotenv.config();

// Check if SMTP is configured
const smtpConfigured = process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD;
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

let transporter;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const renderEmailShell = ({ previewText, title, intro, sections, primaryAction, secondaryAction, footerNote }) => `
  <div style="margin:0;padding:24px;background-color:#f4f7fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(previewText)}</div>
    <div style="max-width:640px;margin:0 auto;background-color:#ffffff;border:1px solid #d7e3f4;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15, 23, 42, 0.08);">
      <div style="background:linear-gradient(135deg,#0f4c81 0%,#1565c0 100%);padding:28px 32px;color:#ffffff;">
        <h1 style="margin:0;font-size:24px;line-height:1.3;">${escapeHtml(title)}</h1>
        <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#e8f1ff;">${escapeHtml(intro)}</p>
      </div>
      <div style="padding:28px 32px;">
        ${sections.map((section) => `
          <div style="margin-bottom:20px;">
            ${section.heading ? `<h2 style="margin:0 0 10px;font-size:17px;color:#0f4c81;">${escapeHtml(section.heading)}</h2>` : ''}
            ${section.body ? `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#334155;">${section.body}</p>` : ''}
            ${section.list?.length ? `<ul style="margin:0;padding-left:20px;color:#334155;line-height:1.8;">${section.list.map((item) => `<li>${item}</li>`).join('')}</ul>` : ''}
          </div>
        `).join('')}
        ${primaryAction ? `
          <div style="margin:28px 0 16px;">
            <a href="${primaryAction.href}" style="display:inline-block;padding:13px 22px;background-color:#1565c0;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;">${escapeHtml(primaryAction.label)}</a>
          </div>
          <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#64748b;">If the button does not open, copy and paste this link into your browser:<br><span style="word-break:break-all;">${escapeHtml(primaryAction.href)}</span></p>
        ` : ''}
        ${secondaryAction ? `
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
            ${escapeHtml(secondaryAction.label)}
            <a href="${secondaryAction.href}" style="color:#1565c0;font-weight:600;">${escapeHtml(secondaryAction.linkText)}</a>
          </p>
        ` : ''}
      </div>
      <div style="padding:20px 32px;background-color:#f8fbff;border-top:1px solid #d7e3f4;">
        <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">${escapeHtml(footerNote)}</p>
      </div>
    </div>
  </div>
`;

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
  console.log('[EMAIL] SMTP configured with:', process.env.SMTP_SERVICE, process.env.SMTP_EMAIL);
} else {
  console.warn('[EMAIL] ⚠️ SMTP NOT CONFIGURED! Email notifications will be logged but not sent.');
  console.warn('[EMAIL] Set SMTP_EMAIL, SMTP_PASSWORD, and SMTP_SERVICE in .env file');
}

export const sendBeneficiaryEmail = async (beneficiaryEmail, beneficiaryName, ownerName) => {
  try {
    const contact = typeof beneficiaryEmail === 'object' ? beneficiaryEmail : null;
    const email = contact?.email || beneficiaryEmail;
    const name = contact?.name || beneficiaryName;

    console.log(`[EMAIL] Attempting to send beneficiary email to ${email}`);
    console.log(`[EMAIL] SMTP Config - Configured: ${smtpConfigured}, Service: ${process.env.SMTP_SERVICE}, Email: ${process.env.SMTP_EMAIL}`);
    
    if (!smtpConfigured) {
      console.warn(`[EMAIL] ⚠️ SMTP not configured. Email NOT sent to ${email}`);
      console.warn('[EMAIL] Configure SMTP in .env: SMTP_EMAIL, SMTP_PASSWORD, SMTP_SERVICE');
      console.warn(`[EMAIL] Current values - SMTP_EMAIL: ${process.env.SMTP_EMAIL ? '✓ SET' : '✗ MISSING'}, SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '✓ SET' : '✗ MISSING'}`);
      return { success: false, message: 'SMTP not configured' };
    }

    const inviteToken = contact ? await ensureBeneficiaryInviteToken(contact) : null;
    const encodedEmail = encodeURIComponent(email);
    const inviteLink = inviteToken ? `${frontendUrl}/beneficiary-invite/${inviteToken}` : null;
    const loginLink = `${frontendUrl}/login?email=${encodedEmail}&next=shared`;

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: `You've been added as a beneficiary - Digital Legacy Manager`,
      html: renderEmailShell({
        previewText: `${ownerName} added you as a beneficiary and sent a secure setup link.`,
        title: 'You have been added as a beneficiary',
        intro: `Hello ${name || 'there'}, ${ownerName} has added this email address as a beneficiary in Digital Legacy Manager.`,
        sections: [
          {
            heading: 'What this means',
            body: `When ${ownerName}'s access conditions are met, you may be granted access to shared digital vault items.`
          },
          {
            heading: 'What to do now',
            list: [
              'Use the same email address that received this message.',
              inviteLink ? 'Open the secure setup link and create your password.' : 'Sign in with your existing account details.',
              'After sign-in, open Shared Access to view anything that has been released to you.'
            ]
          },
          {
            heading: 'Important',
            body: 'You do not have to ask the owner for a password. Passwords are never sent by email.'
          }
        ],
        primaryAction: inviteLink
          ? { href: inviteLink, label: 'Create Password and Activate Access' }
          : null,
        secondaryAction: {
          label: 'If you already have an account, you can sign in here: ',
          href: loginLink,
          linkText: 'Open Login'
        },
        footerNote: 'If you were not expecting this message, contact the account owner before taking any action.'
      }),
      text: `You have been added as a beneficiary in Digital Legacy Manager.\n\nOwner: ${ownerName}\nBeneficiary email: ${email}\n\nWhat to do next:\n- Use the same email address that received this message.\n- ${inviteLink ? `Create your password here: ${inviteLink}` : 'Sign in with your existing account.'}\n- After sign-in, open Shared Access to view released items.\n\nLogin link: ${loginLink}\n\nPasswords are never sent by email.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Beneficiary email sent to ${email}. Message ID: ${result.messageId}`);
    return { success: true, message: 'Email sent successfully', messageId: result.messageId };
  } catch (error) {
    console.error(`[EMAIL] ❌ Error sending beneficiary email:`, error);
    console.error(`[EMAIL] Error details:`, {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall
    });
    return { success: false, message: error.message, error: error.code || 'UNKNOWN_ERROR' };
  }
};

export const sendAccessGrantedEmail = async (beneficiaryEmail, beneficiaryName, ownerName) => {
  try {
    const contact = typeof beneficiaryEmail === 'object' ? beneficiaryEmail : null;
    const email = contact?.email || beneficiaryEmail;
    const name = contact?.name || beneficiaryName;

    console.log(`[EMAIL] Attempting to send access granted email to ${email}`);
    
    if (!smtpConfigured) {
      console.warn(`[EMAIL] ⚠️ SMTP not configured. Email NOT sent to ${email}`);
      console.warn('[EMAIL] Configure SMTP in .env: SMTP_EMAIL, SMTP_PASSWORD, SMTP_SERVICE');
      return { success: false, message: 'SMTP not configured' };
    }
    
    const inviteToken = contact ? await ensureBeneficiaryInviteToken(contact) : null;
    const encodedEmail = encodeURIComponent(email);
    const inviteLink = inviteToken ? `${frontendUrl}/beneficiary-invite/${inviteToken}` : null;
    const loginLink = `${frontendUrl}/login?email=${encodedEmail}&next=shared`;

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: `Vault Access Granted - Digital Legacy Manager`,
      html: renderEmailShell({
        previewText: `${ownerName}'s shared vault access is now available to you.`,
        title: 'Your shared vault access is ready',
        intro: `Hello ${name || 'there'}, access to shared items from ${ownerName} is now available in Digital Legacy Manager.`,
        sections: [
          {
            heading: 'Open your shared access',
            list: [
              'Sign in with the same email address that received this message.',
              'Open the Shared Access section after login.',
              'Review the items that have been released to you.'
            ]
          },
          inviteLink
            ? {
                heading: 'Need to activate your beneficiary account first?',
                body: 'Create your password first, then sign in to view the shared vault items.'
              }
            : {
                heading: 'Security note',
                body: 'Passwords are never sent by email. If you already activated access, just sign in.'
              }
        ],
        primaryAction: inviteLink
          ? { href: inviteLink, label: 'Activate Beneficiary Access' }
          : { href: loginLink, label: 'Open Shared Access Login' },
        secondaryAction: inviteLink
          ? {
              label: 'Already activated your account? ',
              href: loginLink,
              linkText: 'Sign in here'
            }
          : null,
        footerNote: 'Use only the same email address that received this message to access the shared vault.'
      }),
      text: `Vault access is now available for you in Digital Legacy Manager.\n\nOwner: ${ownerName}\nRecipient: ${email}\n\nNext steps:\n- Sign in with the same email address that received this message.\n- Open Shared Access after login.\n${inviteLink ? `- Activate access first here: ${inviteLink}\n` : ''}\nLogin link: ${loginLink}\n\nPasswords are never sent by email.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Access granted email sent to ${email}. Message ID: ${result.messageId}`);
    return { success: true, message: 'Access notification sent successfully', messageId: result.messageId };
  } catch (error) {
    console.error(`[EMAIL] ❌ Error sending access email to ${beneficiaryEmail}:`, error);
    console.error(`[EMAIL] Error details:`, {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall
    });
    return { success: false, message: error.message, error: error.code || 'UNKNOWN_ERROR' };
  }
};

export const sendPasswordResetEmail = async (email, name, resetLink) => {
  try {
    if (!smtpConfigured) {
      console.warn(`[EMAIL] SMTP not configured. Password reset email NOT sent to ${email}`);
      return { success: false, message: 'SMTP not configured' };
    }

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: 'Reset Your Password - Digital Legacy Manager',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your Digital Legacy Manager password.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <br/>
        <p>Best regards,<br/>Digital Legacy Manager Team</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Password reset email sent to ${email}. Message ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending password reset email:', error);
    return { success: false, message: error.message };
  }
};

export default { sendBeneficiaryEmail, sendAccessGrantedEmail, sendPasswordResetEmail };
