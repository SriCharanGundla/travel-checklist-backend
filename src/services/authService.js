const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');
const { bcrypt: bcryptConfig } = require('../config/auth');
const AppError = require('../utils/AppError');
const userService = require('./userService');
const tokenService = require('./tokenService');
const passwordResetService = require('./passwordResetService');
const emailService = require('./emailService');

const buildUserResponse = (user) => {
  const safeUser = user.toSafeJSON ? user.toSafeJSON() : user.get({ plain: true });
  return {
    id: safeUser.id,
    email: safeUser.email,
    firstName: safeUser.firstName,
    lastName: safeUser.lastName,
    role: safeUser.role,
    timezone: safeUser.timezone,
    lastLoginAt: safeUser.lastLoginAt,
    createdAt: safeUser.createdAt,
    updatedAt: safeUser.updatedAt,
  };
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const register = async (payload, context) => {
  const email = payload.email.toLowerCase();
  const existingUser = await userService.findUserByEmail(email);

  if (existingUser) {
    throw new AppError('Email already in use', 409, 'AUTH.EMAIL_IN_USE');
  }

  const hashedPassword = await bcrypt.hash(payload.password, bcryptConfig.rounds);

  const user = await sequelize.transaction(async (transaction) => {
    const createdUser = await userService.createUser(
      {
        email,
        passwordHash: hashedPassword,
        firstName: normalizeOptionalString(payload.firstName),
        lastName: normalizeOptionalString(payload.lastName),
        timezone: normalizeOptionalString(payload.timezone),
      },
      { transaction }
    );

    return createdUser;
  });

  const tokens = await tokenService.generateAuthTokens(user, context);

  return {
    user: buildUserResponse(user),
    tokens,
  };
};

const login = async (payload, context) => {
  const email = payload.email.toLowerCase();
  const user = await userService.findUserByEmail(email);

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'AUTH.INVALID_CREDENTIALS');
  }

  const isValidPassword = await bcrypt.compare(payload.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401, 'AUTH.INVALID_CREDENTIALS');
  }

  await userService.updateLastLogin(user.id);

  const tokens = await tokenService.generateAuthTokens(user, context);

  return {
    user: buildUserResponse(user),
    tokens,
  };
};

const refreshTokens = async (refreshToken, context) => {
  const { user, refreshTokenRecord } = await tokenService.verifyRefreshToken(refreshToken);

  refreshTokenRecord.revokedAt = new Date();
  await refreshTokenRecord.save({ hooks: false, silent: true });

  const tokens = await tokenService.generateAuthTokens(user, context);

  return {
    user: buildUserResponse(user),
    tokens,
  };
};

const logout = async (userId, refreshToken) => {
  await tokenService.revokeRefreshToken(refreshToken, userId);
};

const getProfile = async (userId) => {
  const user = await userService.findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'AUTH.USER_NOT_FOUND');
  }

  return buildUserResponse(user);
};

const requestPasswordReset = async (email, context) => {
  if (!email || typeof email !== 'string') {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return;
  }

  const user = await userService.findUserByEmail(normalizedEmail);

  if (!user) {
    return;
  }

  const { token, expiresAt } = await passwordResetService.generateResetToken(user, context);

  await emailService.sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName,
    token,
    expiresAt,
  });
};

const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new AppError('Reset token is required', 400, 'AUTH.RESET_TOKEN_REQUIRED');
  }

  const tokenRecord = await passwordResetService.verifyToken(token);
  const { user } = tokenRecord;

  const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.rounds);
  await userService.updatePassword(user.id, hashedPassword);

  await passwordResetService.markTokenAsUsed(tokenRecord);
  await tokenService.revokeUserTokens(user.id);

  const updatedUser = await userService.findUserById(user.id);

  return buildUserResponse(updatedUser);
};

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  getProfile,
  requestPasswordReset,
  resetPassword,
};
