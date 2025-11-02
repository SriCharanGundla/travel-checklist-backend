const { DOCUMENT_TYPES, DOCUMENT_STATUS } = require('../config/constants');
const { encryptField, decryptField } = require('../utils/encryption');

module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define(
    'Document',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      travelerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'traveler_id',
      },
      type: {
        type: DataTypes.ENUM(...Object.values(DOCUMENT_TYPES)),
        allowNull: false,
        defaultValue: DOCUMENT_TYPES.PASSPORT,
      },
      identifier: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          const encrypted = encryptField(value);
          if (encrypted === undefined) {
            return;
          }
          this.setDataValue('identifier', encrypted);
        },
        get() {
          return decryptField(this.getDataValue('identifier'));
        },
      },
      issuingCountry: {
        type: DataTypes.STRING(2),
        allowNull: true,
        field: 'issuing_country',
      },
      issuedDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'issued_date',
      },
      expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'expiry_date',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(DOCUMENT_STATUS)),
        allowNull: false,
        defaultValue: DOCUMENT_STATUS.PENDING,
      },
      fileUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'file_url',
        set(value) {
          const encrypted = encryptField(value);
          if (encrypted === undefined) {
            return;
          }
          this.setDataValue('fileUrl', encrypted);
        },
        get() {
          return decryptField(this.getDataValue('fileUrl'));
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
      tableName: 'documents',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [
          ['expiryDate', 'ASC'],
          ['createdAt', 'DESC'],
        ],
      },
    }
  );

  Document.associate = (models) => {
    Document.belongsTo(models.Traveler, {
      as: 'traveler',
      foreignKey: 'travelerId',
    });
  };

  return Document;
};
