const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { allowedHosts, signingSecret, defaultLinkTtlSeconds, downloadBaseUrl, enforceHttps, maxUrlLength } = require('../config/vault');

const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;
const TOKEN_VERSION = 'v1';

const ensureSigningSecret = () => {
  if (!signingSecret) {
    throw new AppError(
      'Document vault signing secret is not configured. Set DOCUMENT_VAULT_SIGNING_SECRET.',
      500,
      'VAULT.MISSING_SECRET'
    );
  }
};

const normalizeVaultReference = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new AppError('fileUrl must be a string', 400, 'VAULT.INVALID_REFERENCE');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > maxUrlLength) {
    throw new AppError('fileUrl exceeds maximum supported length', 400, 'VAULT.URL_TOO_LONG');
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    throw new AppError('fileUrl must be a valid URL', 400, 'VAULT.INVALID_URL');
  }

  if (enforceHttps && parsed.protocol !== 'https:') {
    throw new AppError('fileUrl must use HTTPS', 400, 'VAULT.UNSAFE_PROTOCOL');
  }

  if (allowedHosts.length > 0 && !allowedHosts.includes(parsed.host)) {
    throw new AppError('fileUrl host is not permitted', 400, 'VAULT.HOST_NOT_ALLOWED');
  }

  parsed.hash = '';
  parsed.search = '';

  return parsed.toString();
};

const extractMetadata = (vaultReference) => {
  if (!vaultReference) {
    return {
      hasFile: false,
      fileName: null,
      host: null,
      pathname: null,
    };
  }

  const parsed = new URL(vaultReference);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const fileName = segments.length ? decodeURIComponent(segments[segments.length - 1]) : null;

  return {
    hasFile: true,
    fileName,
    host: parsed.host,
    pathname: parsed.pathname,
  };
};

const encode = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');
const decode = (token) => JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));

const generateAccessGrant = ({ documentId, userId, vaultReference, expiresInSeconds }) => {
  ensureSigningSecret();

  if (!vaultReference) {
    throw new AppError('Document does not have a secure vault reference', 404, 'VAULT.MISSING_REFERENCE');
  }

  const expiresAt =
    typeof expiresInSeconds === 'number' && expiresInSeconds > 0
      ? Date.now() + expiresInSeconds * 1000
      : Date.now() + defaultLinkTtlSeconds * 1000;

  const payload = {
    v: TOKEN_VERSION,
    doc: documentId,
    usr: userId,
    exp: expiresAt,
  };

  const token = encode(payload);
  const signature = crypto.createHmac('sha256', signingSecret).update(token).digest('base64url');

  return {
    token,
    signature,
    expiresAt: new Date(expiresAt).toISOString(),
    vaultReference,
  };
};

const verifyAccessGrant = ({ documentId, token, signature }) => {
  ensureSigningSecret();

  if (!token || !signature) {
    throw new AppError('Missing vault access token', 400, 'VAULT.MISSING_TOKEN');
  }

  if (!BASE64URL_REGEX.test(signature)) {
    throw new AppError('Invalid vault signature format', 400, 'VAULT.INVALID_SIGNATURE');
  }

  let payload;
  try {
    payload = decode(token);
  } catch (error) {
    throw new AppError('Invalid vault token', 400, 'VAULT.INVALID_TOKEN');
  }

  const expectedSignature = crypto.createHmac('sha256', signingSecret).update(token).digest('base64url');
  if (signature.length !== expectedSignature.length) {
    throw new AppError('Vault token signature mismatch', 401, 'VAULT.BAD_SIGNATURE');
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )
  ) {
    throw new AppError('Vault token signature mismatch', 401, 'VAULT.BAD_SIGNATURE');
  }

  if (payload.v !== TOKEN_VERSION) {
    throw new AppError('Vault token version is not supported', 400, 'VAULT.UNSUPPORTED_VERSION');
  }

  if (payload.doc !== documentId) {
    throw new AppError('Vault token does not match the requested document', 403, 'VAULT.DOCUMENT_MISMATCH');
  }

  if (payload.exp <= Date.now()) {
    throw new AppError('Vault token has expired', 410, 'VAULT.TOKEN_EXPIRED');
  }

  return payload;
};

const buildDownloadPath = (documentId, token, signature, request) => {
  const relativePath = `/api/v1/documents/${documentId}/vault-download?token=${encodeURIComponent(
    token
  )}&signature=${encodeURIComponent(signature)}`;

  if (!downloadBaseUrl) {
    if (!request) {
      return relativePath;
    }

    const origin = `${request.protocol}://${request.get('host')}`;
    return `${origin}${relativePath}`;
  }

  return `${downloadBaseUrl.replace(/\/$/, '')}${relativePath}`;
};

module.exports = {
  normalizeVaultReference,
  extractMetadata,
  generateAccessGrant,
  verifyAccessGrant,
  buildDownloadPath,
};
