const crypto = require('crypto');
const { getEncryptionKey } = require('../config/security');

const ENCRYPTION_PREFIX = 'ENC.v1:';
const IV_LENGTH = 12; // AES-GCM recommended IV length

const normalizeInput = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  return String(value);
};

const encryptField = (value) => {
  const normalized = normalizeInput(value);
  if (normalized === undefined) {
    return undefined;
  }

  if (normalized === null) {
    return null;
  }

  if (normalized.startsWith(ENCRYPTION_PREFIX)) {
    return normalized;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64');
  return `${ENCRYPTION_PREFIX}${payload}`;
};

const decryptField = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  if (!value.startsWith(ENCRYPTION_PREFIX)) {
    return value;
  }

  try {
    const encoded = value.slice(ENCRYPTION_PREFIX.length);
    const buffer = Buffer.from(encoded, 'base64');
    const iv = buffer.slice(0, IV_LENGTH);
    const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = buffer.slice(IV_LENGTH + 16);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[encryption] Failed to decrypt field. Returning redacted value.', error);
    return null;
  }
};

module.exports = {
  encryptField,
  decryptField,
  ENCRYPTION_PREFIX,
};
