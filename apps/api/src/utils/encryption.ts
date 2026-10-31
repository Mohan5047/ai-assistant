import crypto from 'node:crypto';
import { getEnv } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const env = getEnv();
  // Ensure exactly 32 bytes from key
  const hash = crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();
  return hash;
}

export function encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

export function decrypt(encryptedHex: string, ivHex: string, tagHex?: string): string {
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');

  if (tagHex) {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Fallback for CBC if stored previously
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
