import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

let _keyBuffer = null;
const getKeyBuffer = () => {
  if (!_keyBuffer) {
    const key = process.env.ENCRYPTION_KEY || 'your_32_char_encryption_key_123456';
    _keyBuffer = crypto.createHash('sha256').update(key).digest();
  }
  return _keyBuffer;
};

export const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
};

export const decrypt = (encryptedData) => {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKeyBuffer(),
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
};
