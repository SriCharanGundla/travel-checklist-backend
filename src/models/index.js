const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize;

if (dbConfig.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbConfig.storage || ':memory:',
    logging: dbConfig.logging,
  });
} else {
  sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions || {},
  });
}

const db = {
  sequelize,
  Sequelize,
};

db.User = require('./User')(sequelize, DataTypes);
db.RefreshToken = require('./RefreshToken')(sequelize, DataTypes);
db.Trip = require('./Trip')(sequelize, DataTypes);
db.PasswordResetToken = require('./PasswordResetToken')(sequelize, DataTypes);
db.Traveler = require('./Traveler')(sequelize, DataTypes);
db.Document = require('./Document')(sequelize, DataTypes);
db.ChecklistCategory = require('./ChecklistCategory')(sequelize, DataTypes);
db.ChecklistItem = require('./ChecklistItem')(sequelize, DataTypes);
db.TripCollaborator = require('./TripCollaborator')(sequelize, DataTypes);
db.ShareLink = require('./ShareLink')(sequelize, DataTypes);
db.ShareLinkAudit = require('./ShareLinkAudit')(sequelize, DataTypes);
db.Expense = require('./Expense')(sequelize, DataTypes);
db.ItineraryItem = require('./ItineraryItem')(sequelize, DataTypes);

Object.keys(db)
  .filter((modelName) => modelName[0] === modelName[0].toUpperCase())
  .forEach((modelName) => {
    if (typeof db[modelName].associate === 'function') {
      db[modelName].associate(db);
    }
  });

module.exports = db;
