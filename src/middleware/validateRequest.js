const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const formatted = errors.array().map((error) => ({
    field: error.param,
    message: error.msg,
    value: error.value,
  }));

  return next(new AppError('Validation failed', 422, 'VALIDATION_ERROR', formatted));
};
