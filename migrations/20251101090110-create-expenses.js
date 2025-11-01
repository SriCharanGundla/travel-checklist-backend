'use strict';

const EXPENSE_CATEGORY_VALUES = [
  'accommodation',
  'transport',
  'food',
  'activities',
  'shopping',
  'other',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expenses', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
      },
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trips',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      category: {
        type: Sequelize.ENUM(...EXPENSE_CATEGORY_VALUES),
        allowNull: false,
        defaultValue: 'other',
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      spent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      merchant: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('expenses', ['trip_id']);
    await queryInterface.addIndex('expenses', ['category']);
    await queryInterface.addIndex('expenses', ['spent_at']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('expenses', ['spent_at']);
    await queryInterface.removeIndex('expenses', ['category']);
    await queryInterface.removeIndex('expenses', ['trip_id']);
    await queryInterface.dropTable('expenses');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_expenses_category";');
  },
};
