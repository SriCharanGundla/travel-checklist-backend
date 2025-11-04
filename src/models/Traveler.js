const { encryptField, decryptField } = require('../utils/encryption');

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
      contactId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'contact_id',
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
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          const encrypted = encryptField(value);
          if (encrypted === undefined) {
            return;
          }
          this.setDataValue('email', encrypted);
        },
        get() {
          return decryptField(this.getDataValue('email'));
        },
      },
      phone: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          const encrypted = encryptField(value);
          if (encrypted === undefined) {
            return;
          }
          this.setDataValue('phone', encrypted);
        },
        get() {
          return decryptField(this.getDataValue('phone'));
        },
      },
      birthdate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      passportNumber: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'passport_number',
        set(value) {
          const encrypted = encryptField(value);
          if (encrypted === undefined) {
            return;
          }
          this.setDataValue('passportNumber', encrypted);
        },
        get() {
          return decryptField(this.getDataValue('passportNumber'));
        },
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
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'emergency_contact_name',
        set(value) {
          const encrypted = encryptField(value);
          if (encrypted === undefined) {
            return;
          }
          this.setDataValue('emergencyContactName', encrypted);
        },
        get() {
          return decryptField(this.getDataValue('emergencyContactName'));
        },
      },
      emergencyContactPhone: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'emergency_contact_phone',
        set(value) {
          const encrypted = encryptField(value);
          if (encrypted === undefined) {
            return;
          }
          this.setDataValue('emergencyContactPhone', encrypted);
        },
        get() {
          return decryptField(this.getDataValue('emergencyContactPhone'));
        },
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          const encrypted = encryptField(value);
          if (encrypted === undefined) {
            return;
          }
          this.setDataValue('notes', encrypted);
        },
        get() {
          return decryptField(this.getDataValue('notes'));
        },
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

    Traveler.belongsTo(models.TravelerContact, {
      as: 'sourceContact',
      foreignKey: 'contactId',
    });
  };

  return Traveler;
};
