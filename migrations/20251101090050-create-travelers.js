'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('travelers', {
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
      full_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      preferred_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      birthdate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      passport_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      passport_country: {
        type: Sequelize.STRING(2),
        allowNull: true,
      },
      passport_expiry: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      emergency_contact_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      emergency_contact_phone: {
        type: Sequelize.STRING(30),
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

    await queryInterface.addIndex('travelers', ['trip_id']);
    await queryInterface.addIndex('travelers', ['full_name']);
    await queryInterface.addIndex('travelers', ['passport_expiry']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('travelers', ['passport_expiry']);
    await queryInterface.removeIndex('travelers', ['full_name']);
    await queryInterface.removeIndex('travelers', ['trip_id']);
    await queryInterface.dropTable('travelers');
  },
};

