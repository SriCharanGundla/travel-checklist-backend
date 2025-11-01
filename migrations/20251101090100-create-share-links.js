'use strict';

const SHARE_LINK_ACCESS_LEVEL_VALUES = ['view', 'contribute'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('share_links', {
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
      label: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      access_level: {
        type: Sequelize.ENUM(...SHARE_LINK_ACCESS_LEVEL_VALUES),
        allowNull: false,
        defaultValue: 'view',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      max_usages: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      revoked_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('share_links', ['trip_id']);
    await queryInterface.addIndex('share_links', ['created_by']);
    await queryInterface.addIndex('share_links', ['revoked_at']);
    await queryInterface.addIndex('share_links', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('share_links', ['expires_at']);
    await queryInterface.removeIndex('share_links', ['revoked_at']);
    await queryInterface.removeIndex('share_links', ['created_by']);
    await queryInterface.removeIndex('share_links', ['trip_id']);
    await queryInterface.dropTable('share_links');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_share_links_access_level";'
    );
  },
};
