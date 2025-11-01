module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define(
    'PasswordResetToken',
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
      tokenHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'token_hash',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at',
      },
    },
    {
      tableName: 'password_reset_tokens',
      underscored: true,
      timestamps: true,
      paranoid: false,
    }
  );

  PasswordResetToken.associate = (models) => {
    PasswordResetToken.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });
  };

  PasswordResetToken.prototype.isUsed = function isUsed() {
    return Boolean(this.usedAt);
  };

  PasswordResetToken.prototype.isExpired = function isExpired(referenceDate = new Date()) {
    return this.expiresAt <= referenceDate;
  };

  return PasswordResetToken;
};

