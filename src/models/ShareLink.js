const { SHARE_LINK_ACCESS_LEVELS } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const ShareLink = sequelize.define(
    'ShareLink',
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
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
      },
      label: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      tokenHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'token_hash',
      },
      accessLevel: {
        type: DataTypes.ENUM(...Object.values(SHARE_LINK_ACCESS_LEVELS)),
        allowNull: false,
        defaultValue: SHARE_LINK_ACCESS_LEVELS.VIEW,
        field: 'access_level',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
      },
      maxUsages: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_usages',
      },
      usageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'usage_count',
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'revoked_at',
      },
    },
    {
      tableName: 'share_links',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [['createdAt', 'DESC']],
      },
    }
  );

  ShareLink.associate = (models) => {
    ShareLink.belongsTo(models.Trip, {
      as: 'trip',
      foreignKey: 'tripId',
    });

    ShareLink.belongsTo(models.User, {
      as: 'creator',
      foreignKey: 'createdBy',
    });

    ShareLink.hasMany(models.ShareLinkAudit, {
      as: 'auditLogs',
      foreignKey: 'shareLinkId',
    });
  };

  ShareLink.prototype.isExpired = function isExpired(referenceDate = new Date()) {
    if (this.revokedAt) {
      return true;
    }

    if (this.expiresAt && new Date(this.expiresAt) < referenceDate) {
      return true;
    }

    if (typeof this.maxUsages === 'number' && this.maxUsages >= 0) {
      return this.usageCount >= this.maxUsages;
    }

    return false;
  };

  return ShareLink;
};
