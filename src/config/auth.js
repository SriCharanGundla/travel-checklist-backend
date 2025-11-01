require('dotenv').config();

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret_key',
    expiresIn: process.env.JWT_EXPIRE || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  },
  passwordReset: {
    tokenBytes: Number.parseInt(process.env.PASSWORD_RESET_TOKEN_BYTES, 10) || 32,
    expiresInMinutes: Number.parseInt(process.env.PASSWORD_RESET_EXPIRE_MINUTES, 10) || 60,
    baseUrl:
      process.env.PASSWORD_RESET_BASE_URL ||
      process.env.FRONTEND_APP_URL ||
      process.env.CLIENT_URL ||
      'http://localhost:3000',
  },
};
