const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'first_name',
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'last_name',
      },
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
      },
      timezone: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at',
      },
    },
    {
      tableName: 'users',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        attributes: { exclude: ['passwordHash'] },
      },
      scopes: {
        withPassword: {
          attributes: { include: ['passwordHash'] },
        },
      },
    }
  );

  User.associate = (models) => {
    User.hasMany(models.Trip, {
      as: 'ownedTrips',
      foreignKey: 'ownerId',
    });

    User.hasMany(models.RefreshToken, {
      as: 'refreshTokens',
      foreignKey: 'userId',
    });
  };

  User.prototype.toSafeJSON = function toSafeJSON() {
    const values = { ...this.get({ plain: true }) };
    delete values.passwordHash;
    return values;
  };

  User.prototype.checkPassword = function checkPassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.getDataValue('passwordHash'));
  };

  return User;
};
