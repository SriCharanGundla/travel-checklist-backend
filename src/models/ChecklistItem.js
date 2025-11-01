const { Op } = require('sequelize');
const { PRIORITY_LEVELS } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const ChecklistItem = sequelize.define(
    'ChecklistItem',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'category_id',
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      priority: {
        type: DataTypes.ENUM(...Object.values(PRIORITY_LEVELS)),
        allowNull: false,
        defaultValue: PRIORITY_LEVELS.MEDIUM,
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'due_date',
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at',
      },
      assigneeTravelerId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'assignee_traveler_id',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
      },
    },
    {
      tableName: 'checklist_items',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      },
      scopes: {
        incomplete: {
          where: { completedAt: null },
        },
        completed: {
          where: {
            completedAt: {
              [Op.ne]: null,
            },
          },
        },
      },
    }
  );

  ChecklistItem.associate = (models) => {
    ChecklistItem.belongsTo(models.ChecklistCategory, {
      as: 'category',
      foreignKey: 'categoryId',
    });

    ChecklistItem.belongsTo(models.Traveler, {
      as: 'assignee',
      foreignKey: 'assigneeTravelerId',
    });
  };

  return ChecklistItem;
};
