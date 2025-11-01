module.exports = (sequelize, DataTypes) => {
  const ChecklistCategory = sequelize.define(
    'ChecklistCategory',
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
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
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
      tableName: 'checklist_categories',
      underscored: true,
      paranoid: true,
      timestamps: true,
      defaultScope: {
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      },
    }
  );

  ChecklistCategory.associate = (models) => {
    ChecklistCategory.belongsTo(models.Trip, {
      as: 'trip',
      foreignKey: 'tripId',
    });

    ChecklistCategory.hasMany(models.ChecklistItem, {
      as: 'items',
      foreignKey: 'categoryId',
    });
  };

  return ChecklistCategory;
};
