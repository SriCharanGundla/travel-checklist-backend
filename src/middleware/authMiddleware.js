const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/auth');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const authenticate = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401, 'AUTH.UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, jwtConfig.secret);

    if (payload.type !== 'access') {
      throw new AppError('Invalid token type', 401, 'AUTH.INVALID_TOKEN');
    }

    const user = await User.findByPk(payload.sub);

    if (!user) {
      throw new AppError('User not found', 401, 'AUTH.USER_NOT_FOUND');
    }

    req.user = user.toSafeJSON ? user.toSafeJSON() : user;
    req.auth = {
      userId: user.id,
      tokenId: payload.jti,
      issuedAt: payload.iat,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Access token expired', 401, 'AUTH.TOKEN_EXPIRED'));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid access token', 401, 'AUTH.INVALID_TOKEN'));
    }

    return next(error);
  }
});

module.exports = authenticate;
