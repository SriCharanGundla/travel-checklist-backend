process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '5m';
process.env.JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30m';
process.env.DATA_PROTECTION_KEY =
  process.env.DATA_PROTECTION_KEY || Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
process.env.DOCUMENT_VAULT_SIGNING_SECRET =
  process.env.DOCUMENT_VAULT_SIGNING_SECRET || 'vault-test-secret';
if (!process.env.DOCUMENT_VAULT_ALLOWED_HOSTS) {
  process.env.DOCUMENT_VAULT_ALLOWED_HOSTS = 'storage.example.com';
}
process.env.DOCUMENT_VAULT_DOWNLOAD_BASE_URL =
  process.env.DOCUMENT_VAULT_DOWNLOAD_BASE_URL || 'https://api.travel-checklist.test';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const { sequelize } = require('../src/models');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
