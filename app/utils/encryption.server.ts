import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const KEY_LENGTH = 32; // For AES-256

// Ensure the master encryption key is set
const masterKeyHex = process.env.ENCRYPTION_KEY;
if (!masterKeyHex || masterKeyHex.length !== KEY_LENGTH * 2) { // 32 bytes = 64 hex characters
  throw new Error('ENCRYPTION_KEY environment variable is missing or invalid. It must be a 32-byte (64 hex characters) key.');
}
const masterKey = Buffer.from(masterKeyHex, 'hex');

/**
 * Encrypts text using AES-256-GCM.
 * @param text The plain text to encrypt.
 * @returns An object containing the encrypted text (hex), IV (hex), and authTag (hex).
 */
export function encrypt(text: string): { encryptedData: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypts text encrypted with AES-256-GCM.
 * @param encryptedData The encrypted text (hex).
 * @param iv The Initialization Vector used for encryption (hex).
 * @param authTag The Authentication Tag generated during encryption (hex).
 * @returns The decrypted plain text, or null if decryption fails.
 */
export function decrypt(encryptedData: string, ivHex: string, authTagHex: string): string | null {
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    // Handle specific errors like 'Unsupported state or unable to authenticate data'
    if (error instanceof Error && error.message.includes('Unsupported state')) {
        console.error("Decryption failed: Authentication tag mismatch or invalid key/IV.");
    }
    return null; // Return null on any decryption error
  }
}
