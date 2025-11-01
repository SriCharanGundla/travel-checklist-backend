const crypto = require('crypto');
const { PasswordResetToken, User } = require('../models');
const { passwordReset } = require('../config/auth');
const tokenService = require('./tokenService');
const AppError = require('../utils/AppError');

const now = () => new Date();

const markExistingTokensAsUsed = async (userId) => {
  await PasswordResetToken.update(
    { usedAt: now() },
    {
      where: {
        userId,
        usedAt: null,
      },
      silent: true,
    }
  );
};

const generateResetToken = async (user, context = {}) => {
  const tokenBytes = passwordReset.tokenBytes > 0 ? passwordReset.tokenBytes : 32;
  const rawToken = crypto.randomBytes(tokenBytes).toString('hex');
  const tokenHash = tokenService.hashToken(rawToken);

  const expiresAt = new Date(now().getTime() + passwordReset.expiresInMinutes * 60 * 1000);

  await markExistingTokensAsUsed(user.id);

  const tokenRecord = await PasswordResetToken.create({
    userId: user.id,
    tokenHash,
    expiresAt,
    // Future fields (ip, user agent) can be added here using context information.
  });

  return { token: rawToken, expiresAt, tokenRecord };
};

const findTokenRecord = async (token) => {
  const hashed = tokenService.hashToken(token);

  const tokenRecord = await PasswordResetToken.findOne({
    where: { tokenHash: hashed },
    include: [
      {
        model: User.scope('withPassword'),
        as: 'user',
      },
    ],
  });

  return tokenRecord;
};

const verifyToken = async (token) => {
  const tokenRecord = await findTokenRecord(token);

  if (!tokenRecord) {
    throw new AppError('Invalid password reset token', 400, 'AUTH.RESET_TOKEN_INVALID');
  }

  if (tokenRecord.isUsed()) {
    throw new AppError('Password reset token has already been used', 400, 'AUTH.RESET_TOKEN_USED');
  }

  if (tokenRecord.isExpired()) {
    throw new AppError('Password reset token has expired', 400, 'AUTH.RESET_TOKEN_EXPIRED');
  }

  if (!tokenRecord.user) {
    throw new AppError('User not found for password reset', 404, 'AUTH.USER_NOT_FOUND');
  }

  return tokenRecord;
};

const markTokenAsUsed = async (tokenRecord) => {
  tokenRecord.usedAt = now();
  await tokenRecord.save({ hooks: false, silent: true });
};

module.exports = {
  generateResetToken,
  verifyToken,
  markTokenAsUsed,
};

