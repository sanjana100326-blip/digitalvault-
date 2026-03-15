import express from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { 
  generateTwoFASecret, 
  verifyTOTPToken, 
  generateBackupCodes,
  verifyBackupCode 
} from '../utils/twofa.js';

const router = express.Router();

/**
 * Enable 2FA - Generate secret and QR code
 */
router.post('/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new secret
    const { secret, qrCode, otpauth_url } = await generateTwoFASecret(user.email);

    res.json({
      message: '2FA setup initiated',
      secret,
      qrCode,
      otpauth_url
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Verify and enable 2FA
 */
router.post('/2fa/verify', authMiddleware, async (req, res) => {
  try {
    const { secret, token } = req.body;

    if (!secret || !token) {
      return res.status(400).json({ message: 'Secret and token are required' });
    }

    // Verify the token
    const isValid = verifyTOTPToken(secret, token);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Update user
    const user = await User.findById(req.userId);
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    res.json({
      message: '2FA enabled successfully',
      backupCodes: backupCodes.map(bc => bc.code)
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Disable 2FA
 */
router.post('/2fa/disable', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const user = await User.findById(req.userId);
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get 2FA status
 */
router.get('/2fa/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      twoFactorEnabled: user.twoFactorEnabled,
      backupCodesRemaining: user.twoFactorBackupCodes ? 
        user.twoFactorBackupCodes.filter(bc => !bc.used).length : 0
    });
  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Regenerate backup codes
 */
router.post('/2fa/regenerate-codes', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const user = await User.findById(req.userId);
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    res.json({
      message: 'Backup codes regenerated',
      backupCodes: backupCodes.map(bc => bc.code)
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
