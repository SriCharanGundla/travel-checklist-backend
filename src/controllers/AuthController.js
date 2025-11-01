const authService = require('../services/authService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const buildContext = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});

const register = catchAsync(async (req, res) => {
  const { user, tokens } = await authService.register(req.body, buildContext(req));

  return sendResponse(res, {
    data: {
      user,
      tokens,
    },
    statusCode: 201,
    message: 'Registration successful',
  });
});

const login = catchAsync(async (req, res) => {
  const { user, tokens } = await authService.login(req.body, buildContext(req));

  return sendResponse(res, {
    data: {
      user,
      tokens,
    },
    message: 'Login successful',
  });
});

const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, 'AUTH.MISSING_REFRESH_TOKEN');
  }

  const { user, tokens } = await authService.refreshTokens(refreshToken, buildContext(req));

  return sendResponse(res, {
    data: {
      user,
      tokens,
    },
    message: 'Tokens refreshed',
  });
});

const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, 'AUTH.MISSING_REFRESH_TOKEN');
  }

  await authService.logout(req.auth.userId, refreshToken);

  return sendResponse(res, {
    data: null,
    message: 'Logged out',
    statusCode: 200,
  });
});

const me = catchAsync(async (req, res) => {
  const profile = await authService.getProfile(req.auth.userId);

  return sendResponse(res, {
    data: profile,
  });
});

const requestPasswordReset = catchAsync(async (req, res) => {
  const { email } = req.body;

  await authService.requestPasswordReset(email, buildContext(req));

  return sendResponse(res, {
    data: null,
    message: 'If an account matches that email, password reset instructions have been sent.',
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  await authService.resetPassword(token, password);

  return sendResponse(res, {
    data: null,
    message: 'Password updated successfully. You can now sign in with your new credentials.',
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  requestPasswordReset,
  resetPassword,
};
