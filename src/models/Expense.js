const { EXPENSE_CATEGORIES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define(
    'Expense',
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
      category: {
        type: DataTypes.ENUM(...Object.values(EXPENSE_CATEGORIES)),
        allowNull: false,
        defaultValue: EXPENSE_CATEGORIES.OTHER,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      spentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'spent_at',
      },
      merchant: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
      },
    },
    {
      tableName: 'expenses',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [
          ['spentAt', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      },
    }
  );

  Expense.associate = (models) => {
    Expense.belongsTo(models.Trip, {
      as: 'trip',
      foreignKey: 'tripId',
    });

    Expense.belongsTo(models.User, {
      as: 'creator',
      foreignKey: 'createdBy',
    });
  };

  Expense.prototype.toSummary = function toSummary() {
    return {
      id: this.id,
      tripId: this.tripId,
      category: this.category,
      amount: Number(this.amount),
      currency: this.currency,
      spentAt: this.spentAt,
    };
  };

  return Expense;
};
