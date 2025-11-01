const pino = require('pino');

const buildBase = () => {
  const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

  return pino({
    level,
    redact: {
      paths: ['req.headers.authorization', 'req.body.password', 'req.body.refreshToken'],
      remove: true,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    base: {
      service: 'travel-checklist-api',
      environment: process.env.NODE_ENV || 'development',
    },
  });
};

module.exports = buildBase();
