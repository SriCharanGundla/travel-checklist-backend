'use strict';

const TRIP_STATUS_VALUES = ['planning', 'confirmed', 'ongoing', 'completed', 'cancelled'];
const TRIP_TYPE_VALUES = ['leisure', 'business', 'adventure', 'family'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trips', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      destination: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(...TRIP_STATUS_VALUES),
        allowNull: false,
        defaultValue: 'planning',
      },
      type: {
        type: Sequelize.ENUM(...TRIP_TYPE_VALUES),
        allowNull: false,
        defaultValue: 'leisure',
      },
      budget_currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      budget_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('trips', ['owner_id']);
    await queryInterface.addIndex('trips', ['status']);
    await queryInterface.addIndex('trips', ['start_date']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('trips', ['start_date']);
    await queryInterface.removeIndex('trips', ['status']);
    await queryInterface.removeIndex('trips', ['owner_id']);
    await queryInterface.dropTable('trips');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trips_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trips_type";');
  },
};
