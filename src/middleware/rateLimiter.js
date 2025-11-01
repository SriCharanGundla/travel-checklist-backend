const rateLimit = require('express-rate-limit');
const { rateLimit: rateLimitConfig } = require('../config/auth');
const logger = require('../utils/logger');

const windowMs = rateLimitConfig.windowMs || 15 * 60 * 1000;
const max = rateLimitConfig.max || 100;

const generalLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
  handler: (req, res, next, options) => {
    logger.warn(
      {
        ip: req.ip,
        method: req.method,
        originalUrl: req.originalUrl,
        requestId: req.id,
        limit: options.max,
      },
      'Rate limit exceeded'
    );

    res.status(options.statusCode).json({
      success: false,
      data: null,
      meta: null,
      error: {
        message: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

const authLimiter = rateLimit({
  windowMs,
  max: Math.max(10, Math.floor(max / 2)),
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts.',
  handler: (req, res, next, options) => {
    logger.warn(
      {
        ip: req.ip,
        method: req.method,
        originalUrl: req.originalUrl,
        requestId: req.id,
        limit: options.max,
      },
      'Authentication rate limit exceeded'
    );

    res.status(options.statusCode).json({
      success: false,
      data: null,
      meta: null,
      error: {
        message: 'Too many authentication attempts. Please wait and try again.',
        code: 'AUTH.RATE_LIMIT',
      },
    });
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
};
