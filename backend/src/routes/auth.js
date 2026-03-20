import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { acceptBeneficiaryInvite, getBeneficiaryInvite } from '../utils/beneficiaryInvite.js';
import { logActivity } from '../utils/logger.js';
import { verifyTOTPToken, verifyBackupCode } from '../utils/twofa.js';
import { sendPasswordResetEmail } from '../utils/email.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    const normalizedUsername = username?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({
        message: 'Username, email, and password are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    const emailConflict = await User.findOne({ email: normalizedEmail }).select('_id');
    if (emailConflict) {
      return res.status(409).json({
        message: 'Email already registered. Please login or use forgot password.',
        code: 'EMAIL_ALREADY_EXISTS',
        field: 'email'
      });
    }

    const usernameConflict = await User.findOne({ username: normalizedUsername }).select('_id');
    if (usernameConflict) {
      return res.status(409).json({
        message: 'Username is already taken. Please choose another username.',
        code: 'USERNAME_ALREADY_EXISTS',
        field: 'username'
      });
    }

    const user = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      firstName,
      lastName
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
      const duplicateValue = error.keyValue?.[duplicateField];
      return res.status(409).json({
        message: `${duplicateField} already exists${duplicateValue ? `: ${duplicateValue}` : ''}`,
        code: 'DUPLICATE_KEY',
        field: duplicateField
      });
    }

    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, twoFactorToken } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(403).json({ 
          message: '2FA token required',
          requires2FA: true
        });
      }

      // Verify 2FA token (TOTP or backup code)
      const isValidTOTP = verifyTOTPToken(user.twoFactorSecret, twoFactorToken);
      let isValidBackupCode = false;

      if (!isValidTOTP) {
        // Try backup code
        isValidBackupCode = verifyBackupCode(user.twoFactorBackupCodes, twoFactorToken);
      }

      if (!isValidTOTP && !isValidBackupCode) {
        return res.status(401).json({ message: 'Invalid 2FA token' });
      }

      // If backup code was used, save it
      if (isValidBackupCode) {
        await user.save();
      }
    }
    
    user.lastLoginAt = new Date();
    user.lastActivityAt = new Date();
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Forgot password: sends reset link to both regular users and beneficiaries (same User account model)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const resetLink = `${baseUrl}/reset-password/${rawToken}?email=${encodeURIComponent(user.email)}`;
      const displayName = user.firstName || user.username || user.email;

      await sendPasswordResetEmail(user.email, displayName, resetLink);
    }

    return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Reset password with token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or expired' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching user',
      mongoError: error.name === 'MongoServerSelectionError' ? 'Database connection failed' : null
    });
  }
});

// Validate beneficiary invite token
router.get('/beneficiary-invite/:token', async (req, res) => {
  try {
    const invite = await getBeneficiaryInvite(req.params.token);
    if (!invite) {
      return res.status(404).json({ message: 'Invite is invalid or has expired' });
    }

    res.json({
      beneficiaryName: invite.contact.name,
      beneficiaryEmail: invite.contact.email,
      ownerName: invite.ownerName,
      hasExistingAccount: invite.hasExistingAccount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept beneficiary invite by setting password and logging in
router.post('/beneficiary-invite/:token/accept', async (req, res) => {
  try {
    const { password, username, firstName, lastName } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const result = await acceptBeneficiaryInvite(req.params.token, {
      password,
      username,
      firstName,
      lastName
    });

    if (!result) {
      return res.status(404).json({ message: 'Invite is invalid or has expired' });
    }

    result.user.lastLoginAt = new Date();
    result.user.lastActivityAt = new Date();
    await result.user.save();

    await logActivity(
      result.contact.userId,
      'beneficiary_invite_accepted',
      `${result.contact.email} completed beneficiary access setup`
    );

    const token = jwt.sign(
      { userId: result.user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: result.hasExistingAccount
        ? 'Beneficiary access updated successfully'
        : 'Beneficiary account created successfully',
      token,
      user: {
        id: result.user._id,
        username: result.user.username,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        twoFactorEnabled: result.user.twoFactorEnabled
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get inactivity reminder settings
router.get('/inactivity-reminder/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      inactivityReminderEnabled: user.inactivityReminderEnabled,
      inactivityReminderDays: user.inactivityReminderDays,
      lastInactivityReminderSentAt: user.lastInactivityReminderSentAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update inactivity reminder settings
router.put('/inactivity-reminder/settings', authMiddleware, async (req, res) => {
  try {
    const { inactivityReminderEnabled, inactivityReminderDays } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof inactivityReminderEnabled === 'boolean') {
      user.inactivityReminderEnabled = inactivityReminderEnabled;
    }

    if (inactivityReminderDays && inactivityReminderDays > 0) {
      user.inactivityReminderDays = inactivityReminderDays;
    }

    await user.save();

    res.json({
      message: 'Inactivity reminder settings updated',
      settings: {
        inactivityReminderEnabled: user.inactivityReminderEnabled,
        inactivityReminderDays: user.inactivityReminderDays
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
