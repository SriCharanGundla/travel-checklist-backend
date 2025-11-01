'use strict';

const PRIORITY_LEVEL_VALUES = ['low', 'medium', 'high', 'critical'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('checklist_items', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'checklist_categories',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM(...PRIORITY_LEVEL_VALUES),
        allowNull: false,
        defaultValue: 'medium',
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      assignee_traveler_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'travelers',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('checklist_items', ['category_id', 'sort_order']);
    await queryInterface.addIndex('checklist_items', ['assignee_traveler_id']);
    await queryInterface.addIndex('checklist_items', ['due_date']);
    await queryInterface.addIndex('checklist_items', ['completed_at']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('checklist_items', ['completed_at']);
    await queryInterface.removeIndex('checklist_items', ['due_date']);
    await queryInterface.removeIndex('checklist_items', ['assignee_traveler_id']);
    await queryInterface.removeIndex('checklist_items', ['category_id', 'sort_order']);
    await queryInterface.dropTable('checklist_items');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_checklist_items_priority";');
  },
};

