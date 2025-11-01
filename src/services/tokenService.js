const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/auth');
const { RefreshToken, User } = require('../models');
const AppError = require('../utils/AppError');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateTokenId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
};

const generateAccessToken = (user) => {
  const payload = {
    sub: user.id,
    type: 'access',
  };

  const options = {
    expiresIn: jwtConfig.expiresIn,
    jwtid: generateTokenId(),
  };

  const token = jwt.sign(payload, jwtConfig.secret, options);

  return token;
};

const generateRefreshToken = async (user, context = {}) => {
  const jti = generateTokenId();
  const payload = {
    sub: user.id,
    type: 'refresh',
  };

  const options = {
    expiresIn: jwtConfig.refreshExpiresIn,
    jwtid: jti,
  };

  const token = jwt.sign(payload, jwtConfig.refreshSecret, options);

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
    userAgent: context.userAgent || null,
    ipAddress: context.ipAddress || null,
  });

  return {
    token,
    expiresAt,
    jti,
  };
};

const generateAuthTokens = async (user, context = {}) => {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, expiresAt } = await generateRefreshToken(user, context);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
  };
};

const verifyRefreshToken = async (token) => {
  try {
    const payload = jwt.verify(token, jwtConfig.refreshSecret);

    if (payload.type !== 'refresh') {
      throw new AppError('Invalid token type', 401, 'AUTH.INVALID_TOKEN');
    }

    const hashedToken = hashToken(token);

    const refreshTokenRecord = await RefreshToken.findOne({
      where: { tokenHash: hashedToken },
    });

    if (!refreshTokenRecord) {
      throw new AppError('Refresh token not found', 401, 'AUTH.TOKEN_NOT_FOUND');
    }

    if (refreshTokenRecord.isRevoked()) {
      throw new AppError('Refresh token has been revoked', 401, 'AUTH.TOKEN_REVOKED');
    }

    if (refreshTokenRecord.expiresAt <= new Date()) {
      throw new AppError('Refresh token has expired', 401, 'AUTH.TOKEN_EXPIRED');
    }

    if (refreshTokenRecord.userId !== payload.sub) {
      throw new AppError('Token subject mismatch', 401, 'AUTH.SUBJECT_MISMATCH');
    }

    const user = await User.findByPk(refreshTokenRecord.userId);

    if (!user) {
      throw new AppError('User not found for refresh token', 401, 'AUTH.USER_NOT_FOUND');
    }

    return { user, refreshTokenRecord };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token has expired', 401, 'AUTH.TOKEN_EXPIRED');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid refresh token', 401, 'AUTH.INVALID_TOKEN');
    }

    throw error;
  }
};

const revokeRefreshToken = async (token, userId) => {
  const hashedToken = hashToken(token);

  const refreshTokenRecord = await RefreshToken.findOne({
    where: {
      tokenHash: hashedToken,
      userId,
    },
  });

  if (!refreshTokenRecord) {
    throw new AppError('Refresh token not found', 404, 'AUTH.TOKEN_NOT_FOUND');
  }

  refreshTokenRecord.revokedAt = new Date();
  await refreshTokenRecord.save({ hooks: false, silent: true });
};

const revokeUserTokens = async (userId) => {
  await RefreshToken.update(
    { revokedAt: new Date() },
    {
      where: {
        userId,
        revokedAt: null,
      },
    }
  );
};

module.exports = {
  generateAuthTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeUserTokens,
  hashToken,
};
