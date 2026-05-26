/**
 * AES-256-GCM encryption for data at rest in Redis
 * Uses Node.js crypto module (server-side only)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'ENC:';

function getKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64) {
    // Fallback: derive from SESSION_SECRET
    const secret = process.env.SESSION_SECRET || '';
    return crypto.createHash('sha256').update(secret).digest();
  }
  return Buffer.from(keyBase64, 'base64');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return PREFIX + combined.toString('base64');
}

export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value; // plaintext passthrough
  const key = getKey();
  const combined = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/** Generate a random AES-256 key (32 bytes, base64 encoded) */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/** Encrypt a binary buffer with a user-specific key (AES-256-GCM) */
export function encryptBuffer(buffer: Buffer, keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]);
}

/** Decrypt a binary buffer with a user-specific key */
export function decryptBuffer(combined: Buffer, keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
