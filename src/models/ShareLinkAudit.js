module.exports = (sequelize, DataTypes) => {
  const ShareLinkAudit = sequelize.define(
    'ShareLinkAudit',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shareLinkId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'share_link_id',
      },
      tripId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'trip_id',
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'accessed',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address',
      },
      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'user_agent',
      },
      performedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'performed_by',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      tableName: 'share_link_audit',
      underscored: true,
      timestamps: false,
    }
  );

  ShareLinkAudit.associate = (models) => {
    ShareLinkAudit.belongsTo(models.ShareLink, {
      as: 'shareLink',
      foreignKey: 'shareLinkId',
    });

    ShareLinkAudit.belongsTo(models.Trip, {
      as: 'trip',
      foreignKey: 'tripId',
    });

    ShareLinkAudit.belongsTo(models.User, {
      as: 'performedByUser',
      foreignKey: 'performedBy',
    });
  };

  return ShareLinkAudit;
};
