import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM

function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.META_APP_SECRET ||
    'quoteflow-meta-waba-secret-key-32b!';
  // Hash to 32 bytes (256 bits) for consistent key length
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a sensitive string (e.g. Meta system user or access token) using AES-256-GCM.
 * Never stores or transmits plaintext tokens.
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a stored token string.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      // In case plaintext was passed during test mode or mock, fallback safely
      return encryptedString;
    }
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[WhatsApp Encryption] Failed to decrypt token:', error);
    return '';
  }
}
