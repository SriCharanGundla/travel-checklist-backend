require('dotenv').config();

const parseCsv = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const allowedHosts = process.env.DOCUMENT_VAULT_ALLOWED_HOSTS
  ? parseCsv(process.env.DOCUMENT_VAULT_ALLOWED_HOSTS)
  : [];

const linkTtlSeconds = Number.parseInt(process.env.DOCUMENT_VAULT_LINK_TTL_SECONDS, 10);

module.exports = {
  allowedHosts,
  signingSecret:
    process.env.DOCUMENT_VAULT_SIGNING_SECRET ||
    process.env.DATA_PROTECTION_KEY ||
    process.env.DATA_ENCRYPTION_KEY ||
    '',
  defaultLinkTtlSeconds: Number.isFinite(linkTtlSeconds) && linkTtlSeconds > 0 ? linkTtlSeconds : 5 * 60,
  downloadBaseUrl: process.env.DOCUMENT_VAULT_DOWNLOAD_BASE_URL || '',
  enforceHttps: process.env.DOCUMENT_VAULT_REQUIRE_HTTPS !== 'false',
  maxUrlLength: Number.parseInt(process.env.DOCUMENT_VAULT_MAX_URL_LENGTH, 10) || 2048,
};
