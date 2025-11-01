const { ValidationError, UniqueConstraintError } = require('sequelize');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  let error = err;

  if (err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON payload', 400, 'REQUEST.INVALID_JSON');
  }

  if (!(error instanceof AppError)) {
    if (error instanceof ValidationError || error instanceof UniqueConstraintError) {
      const details = error.errors.map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      }));
      error = new AppError('Validation failed', 422, 'VALIDATION_ERROR', details);
    } else if (error.message === 'Too many requests, please try again later.') {
      error = new AppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    } else {
      error = new AppError(error.message || 'Internal server error', error.statusCode || 500);
    }
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    data: null,
    meta: null,
    error: {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR',
      details: error.details || null,
    },
  };

  if (statusCode >= 500) {
    logger.error({
      err,
      path: req.originalUrl,
      method: req.method,
      requestId: req.id,
    }, err.message);
  } else if (statusCode >= 400) {
    logger.warn({
      err,
      path: req.originalUrl,
      method: req.method,
      requestId: req.id,
    }, err.message);
  }

  res.status(statusCode).json(response);
};
