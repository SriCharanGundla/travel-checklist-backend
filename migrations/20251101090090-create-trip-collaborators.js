'use strict';

const PERMISSION_LEVEL_VALUES = ['view', 'edit', 'admin'];
const COLLABORATOR_STATUS_VALUES = ['pending', 'accepted', 'declined'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trip_collaborators', {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      inviter_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      permission_level: {
        type: Sequelize.ENUM(...PERMISSION_LEVEL_VALUES),
        allowNull: false,
        defaultValue: 'view',
      },
      status: {
        type: Sequelize.ENUM(...COLLABORATOR_STATUS_VALUES),
        allowNull: false,
        defaultValue: 'pending',
      },
      invitation_token_hash: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      invited_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      responded_at: {
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

    await queryInterface.addIndex('trip_collaborators', ['trip_id', 'email'], {
      unique: true,
      where: {
        deleted_at: null,
      },
      name: 'trip_collaborators_trip_email_unique',
    });

    await queryInterface.addIndex('trip_collaborators', ['invitation_token_hash']);
    await queryInterface.addIndex('trip_collaborators', ['user_id']);
    await queryInterface.addIndex('trip_collaborators', ['trip_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('trip_collaborators', ['trip_id']);
    await queryInterface.removeIndex('trip_collaborators', ['user_id']);
    await queryInterface.removeIndex('trip_collaborators', ['invitation_token_hash']);
    await queryInterface.removeIndex('trip_collaborators', 'trip_collaborators_trip_email_unique');
    await queryInterface.dropTable('trip_collaborators');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_trip_collaborators_permission_level";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_trip_collaborators_status";'
    );
  },
};
