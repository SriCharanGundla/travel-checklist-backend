const { ITINERARY_TYPES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const ItineraryItem = sequelize.define(
    'ItineraryItem',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tripId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'trip_id',
      },
      type: {
        type: DataTypes.ENUM(...Object.values(ITINERARY_TYPES)),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      provider: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'start_time',
      },
      endTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'end_time',
      },
      bookingReference: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'booking_reference',
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
      },
    },
    {
      tableName: 'itinerary_items',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [
          ['startTime', 'ASC'],
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      },
    }
  );

  ItineraryItem.associate = (models) => {
    ItineraryItem.belongsTo(models.Trip, {
      as: 'trip',
      foreignKey: 'tripId',
    });
  };

  return ItineraryItem;
};
