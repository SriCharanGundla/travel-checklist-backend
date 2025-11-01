const { TRIP_STATUS, TRIP_TYPES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const Trip = sequelize.define(
    'Trip',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'owner_id',
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      destination: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'start_date',
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'end_date',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(TRIP_STATUS)),
        allowNull: false,
        defaultValue: TRIP_STATUS.PLANNING,
      },
      type: {
        type: DataTypes.ENUM(...Object.values(TRIP_TYPES)),
        allowNull: false,
        defaultValue: TRIP_TYPES.LEISURE,
      },
      budgetCurrency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        field: 'budget_currency',
      },
      budgetAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'budget_amount',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'trips',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [['startDate', 'ASC'], ['createdAt', 'DESC']],
      },
    }
  );

  Trip.associate = (models) => {
    Trip.belongsTo(models.User, {
      as: 'owner',
      foreignKey: 'ownerId',
    });

    Trip.hasMany(models.Traveler, {
      as: 'travelers',
      foreignKey: 'tripId',
    });

    Trip.hasMany(models.ChecklistCategory, {
      as: 'checklistCategories',
      foreignKey: 'tripId',
    });
  };

  return Trip;
};
