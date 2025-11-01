const { PERMISSION_LEVELS, COLLABORATOR_STATUS } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const TripCollaborator = sequelize.define(
    'TripCollaborator',
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
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'user_id',
      },
      inviterId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'inviter_id',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        set(value) {
          if (typeof value === 'string') {
            this.setDataValue('email', value.trim().toLowerCase());
          } else {
            this.setDataValue('email', value);
          }
        },
      },
      permissionLevel: {
        type: DataTypes.ENUM(...Object.values(PERMISSION_LEVELS)),
        allowNull: false,
        defaultValue: PERMISSION_LEVELS.VIEW,
        field: 'permission_level',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(COLLABORATOR_STATUS)),
        allowNull: false,
        defaultValue: COLLABORATOR_STATUS.PENDING,
      },
      invitationTokenHash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'invitation_token_hash',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
      },
      invitedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'invited_at',
      },
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'responded_at',
      },
    },
    {
      tableName: 'trip_collaborators',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [
          ['status', 'ASC'],
          ['invitedAt', 'DESC'],
        ],
      },
      scopes: {
        pending: {
          where: { status: COLLABORATOR_STATUS.PENDING },
        },
      },
    }
  );

  TripCollaborator.associate = (models) => {
    TripCollaborator.belongsTo(models.Trip, {
      as: 'trip',
      foreignKey: 'tripId',
    });

    TripCollaborator.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'userId',
    });

    TripCollaborator.belongsTo(models.User, {
      as: 'inviter',
      foreignKey: 'inviterId',
    });
  };

  TripCollaborator.prototype.isPending = function isPending() {
    return this.status === COLLABORATOR_STATUS.PENDING;
  };

  return TripCollaborator;
};
