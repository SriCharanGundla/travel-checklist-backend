require('dotenv').config();
const crypto = require('crypto');

const deriveKeyFromValue = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Try base64 decoding first
  try {
    const base64Buffer = Buffer.from(trimmed, 'base64');
    if (base64Buffer.length === 32) {
      return base64Buffer;
    }
  } catch (error) {
    // fall through to other parsing strategies
  }

  // Try hex decoding
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === 64) {
    return Buffer.from(trimmed, 'hex');
  }

  // Fallback: derive from arbitrary secret using SHA-256
  if (trimmed.length >= 16) {
    return crypto.createHash('sha256').update(trimmed).digest();
  }

  return null;
};

const rawKey =
  process.env.DATA_PROTECTION_KEY ||
  process.env.DATA_ENCRYPTION_KEY ||
  process.env.SENSITIVE_DATA_KEY ||
  null;

let cachedKey = null;
let hasWarned = false;

const getEncryptionKey = () => {
  if (cachedKey) {
    return cachedKey;
  }

  const derivedKey = deriveKeyFromValue(rawKey);
  if (derivedKey) {
    cachedKey = derivedKey;
    return cachedKey;
  }

  if (!hasWarned) {
    console.warn(
      '[security] DATA_PROTECTION_KEY missing; using development fallback. Set a 32-byte base64 key in production.'
    );
    hasWarned = true;
  }

  cachedKey = crypto.createHash('sha256').update('travel-checklist-dev-fallback-key').digest();
  return cachedKey;
};

module.exports = {
  getEncryptionKey,
};
