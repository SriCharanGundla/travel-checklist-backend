const disallowedPattern = /<\/?\s*script[^>]*>/gi;
const unsafeProtocolPattern = /javascript:/gi;
const controlCharsPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .replace(disallowedPattern, '')
    .replace(unsafeProtocolPattern, '')
    .replace(controlCharsPattern, '')
    .trim();
};

const sanitizeValue = (value) => {
  if (value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value instanceof Date || value instanceof Buffer) {
    return value;
  }

  if (typeof value === 'object') {
    const sanitized = {};
    Object.keys(value).forEach((key) => {
      sanitized[key] = sanitizeValue(value[key]);
    });
    return sanitized;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  return value;
};

module.exports = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }

  next();
};
