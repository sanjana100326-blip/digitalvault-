import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

/**
 * Generate a TOTP secret and QR code for 2FA setup
 */
export const generateTwoFASecret = async (email) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Digital Legacy Manager (${email})`,
      issuer: 'Digital Legacy Manager',
      length: 32
    });

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode,
      otpauth_url: secret.otpauth_url
    };
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    throw error;
  }
};

/**
 * Verify TOTP token
 */
export const verifyTOTPToken = (secret, token) => {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps in either direction for clock skew
    });

    return verified;
  } catch (error) {
    console.error('Error verifying TOTP token:', error);
    return false;
  }
};

/**
 * Generate backup codes for 2FA
 */
export const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate codes in format: XXXX-XXXX-XXXX
    const code = Array.from({ length: 12 }, () =>
      Math.floor(Math.random() * 10)
    ).join('');
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
    codes.push({
      code: formatted,
      used: false
    });
  }
  return codes;
};

/**
 * Verify and consume a backup code
 */
export const verifyBackupCode = (backupCodes, code) => {
  const backupCode = backupCodes.find(
    bc => bc.code === code.toUpperCase() && !bc.used
  );

  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    return true;
  }
  return false;
};

export default {
  generateTwoFASecret,
  verifyTOTPToken,
  generateBackupCodes,
  verifyBackupCode
};
