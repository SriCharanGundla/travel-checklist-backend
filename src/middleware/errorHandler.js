const { ValidationError, UniqueConstraintError } = require('sequelize');
const AppError = require('../utils/AppError');

module.exports = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    if (error instanceof ValidationError || error instanceof UniqueConstraintError) {
      const details = error.errors.map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      }));
      error = new AppError('Validation failed', 422, 'VALIDATION_ERROR', details);
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
    console.error('[Error]', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json(response);
};
