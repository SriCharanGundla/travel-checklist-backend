'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('checklist_categories', {
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
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
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

    await queryInterface.addIndex('checklist_categories', ['trip_id', 'sort_order']);
    await queryInterface.addConstraint('checklist_categories', {
      fields: ['trip_id', 'slug'],
      type: 'unique',
      name: 'checklist_categories_trip_id_slug_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'checklist_categories',
      'checklist_categories_trip_id_slug_unique'
    );
    await queryInterface.removeIndex('checklist_categories', ['trip_id', 'sort_order']);
    await queryInterface.dropTable('checklist_categories');
  },
};
