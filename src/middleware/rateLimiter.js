const rateLimit = require('express-rate-limit');
const { rateLimit: rateLimitConfig } = require('../config/auth');

const windowMs = rateLimitConfig.windowMs || 15 * 60 * 1000;
const max = rateLimitConfig.max || 100;

const generalLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs,
  max: Math.max(10, Math.floor(max / 2)),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
};
