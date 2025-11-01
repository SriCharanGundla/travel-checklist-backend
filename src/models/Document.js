const { DOCUMENT_TYPES, DOCUMENT_STATUS } = require('../config/constants');

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
        type: DataTypes.STRING(100),
        allowNull: true,
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
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'file_url',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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

