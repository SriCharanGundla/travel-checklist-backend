const { encryptField, decryptField } = require('../utils/encryption');

module.exports = (sequelize, DataTypes) => {
  const TravelerContact = sequelize.define(
    'TravelerContact',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
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
      tableName: 'traveler_contacts',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [
          ['fullName', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      },
    }
  );

  TravelerContact.associate = (models) => {
    TravelerContact.belongsTo(models.User, {
      as: 'owner',
      foreignKey: 'userId',
    });
  };

  return TravelerContact;
};
