const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');
const { bcrypt: bcryptConfig } = require('../config/auth');
const AppError = require('../utils/AppError');
const userService = require('./userService');
const tokenService = require('./tokenService');

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

const register = async (payload, context) => {
  const existingUser = await userService.findUserByEmail(payload.email);

  if (existingUser) {
    throw new AppError('Email already in use', 409, 'AUTH.EMAIL_IN_USE');
  }

  const hashedPassword = await bcrypt.hash(payload.password, bcryptConfig.rounds);

  const user = await sequelize.transaction(async (transaction) => {
    const createdUser = await userService.createUser(
      {
        email: payload.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: payload.firstName,
        lastName: payload.lastName,
        timezone: payload.timezone,
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
  const user = await userService.findUserByEmail(payload.email);

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

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  getProfile,
};
