module.exports = (sequelize, DataTypes) => {
  const Traveler = sequelize.define(
    'Traveler',
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
      fullName: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: 'full_name',
      },
      preferredName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'preferred_name',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      birthdate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      passportNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'passport_number',
      },
      passportCountry: {
        type: DataTypes.STRING(2),
        allowNull: true,
        field: 'passport_country',
      },
      passportExpiry: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'passport_expiry',
      },
      emergencyContactName: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'emergency_contact_name',
      },
      emergencyContactPhone: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: 'emergency_contact_phone',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'travelers',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [
          ['createdAt', 'ASC'],
          ['fullName', 'ASC'],
        ],
      },
    }
  );

  Traveler.associate = (models) => {
    Traveler.belongsTo(models.Trip, {
      as: 'trip',
      foreignKey: 'tripId',
    });

    Traveler.hasMany(models.Document, {
      as: 'documents',
      foreignKey: 'travelerId',
    });

    Traveler.hasMany(models.ChecklistItem, {
      as: 'assignedItems',
      foreignKey: 'assigneeTravelerId',
    });
  };

  return Traveler;
};

