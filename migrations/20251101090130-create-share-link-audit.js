'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('share_link_audit', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
      },
      share_link_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'share_links',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'accessed',
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      performed_by: {
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
    });

    await queryInterface.addIndex('share_link_audit', ['share_link_id']);
    await queryInterface.addIndex('share_link_audit', ['trip_id']);
    await queryInterface.addIndex('share_link_audit', ['action']);
    await queryInterface.addIndex('share_link_audit', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('share_link_audit', ['created_at']);
    await queryInterface.removeIndex('share_link_audit', ['action']);
    await queryInterface.removeIndex('share_link_audit', ['trip_id']);
    await queryInterface.removeIndex('share_link_audit', ['share_link_id']);
    await queryInterface.dropTable('share_link_audit');
  },
};
