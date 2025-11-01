'use strict';

const ITINERARY_TYPE_VALUES = ['flight', 'accommodation', 'activity', 'restaurant', 'transport'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('itinerary_items', {
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
      type: {
        type: Sequelize.ENUM(...ITINERARY_TYPE_VALUES),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      provider: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      booking_reference: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
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

    await queryInterface.addIndex('itinerary_items', ['trip_id']);
    await queryInterface.addIndex('itinerary_items', ['start_time']);
    await queryInterface.addIndex('itinerary_items', ['type']);
    await queryInterface.addIndex('itinerary_items', ['sort_order']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('itinerary_items', ['sort_order']);
    await queryInterface.removeIndex('itinerary_items', ['type']);
    await queryInterface.removeIndex('itinerary_items', ['start_time']);
    await queryInterface.removeIndex('itinerary_items', ['trip_id']);
    await queryInterface.dropTable('itinerary_items');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_itinerary_items_type";'
    );
  },
};
