const app = require('./src/app');
const { sequelize } = require('./src/models');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    const shouldSync = process.env.NODE_ENV === 'development' && process.env.SYNC_DATABASE === 'true';

    if (shouldSync) {
      await sequelize.sync({ alter: false });
      logger.warn('Database synchronized via sequelize.sync (development mode)');
    }

    app.listen(PORT, () => {
      const environment = process.env.NODE_ENV || 'development';
      logger.info({
        port: PORT,
        environment,
        api: `/api`,
        health: '/health',
        metrics: '/metrics',
      }, 'Server started');
    });
  } catch (error) {
    logger.error({ err: error }, 'Unable to connect to database');
    process.exit(1);
  }
};

startServer();
