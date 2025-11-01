const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    const shouldSync = process.env.NODE_ENV === 'development' && process.env.SYNC_DATABASE === 'true';

    if (shouldSync) {
      await sequelize.sync({ alter: false });
      console.log('🗃️ Database synchronized via sequelize.sync (development mode)');
    }

    app.listen(PORT, () => {
      const environment = process.env.NODE_ENV || 'development';
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${environment}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};

startServer();
