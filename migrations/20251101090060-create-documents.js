'use strict';

const DOCUMENT_TYPE_VALUES = ['passport', 'visa', 'insurance', 'vaccination', 'license'];
const DOCUMENT_STATUS_VALUES = [
  'pending',
  'valid',
  'expiring_soon',
  'expired',
  'applied',
  'approved',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
      },
      traveler_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'travelers',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(...DOCUMENT_TYPE_VALUES),
        allowNull: false,
        defaultValue: 'passport',
      },
      identifier: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      issuing_country: {
        type: Sequelize.STRING(2),
        allowNull: true,
      },
      issued_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(...DOCUMENT_STATUS_VALUES),
        allowNull: false,
        defaultValue: 'pending',
      },
      file_url: {
        type: Sequelize.STRING(255),
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

    await queryInterface.addIndex('documents', ['traveler_id']);
    await queryInterface.addIndex('documents', ['type']);
    await queryInterface.addIndex('documents', ['status']);
    await queryInterface.addIndex('documents', ['expiry_date']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('documents', ['expiry_date']);
    await queryInterface.removeIndex('documents', ['status']);
    await queryInterface.removeIndex('documents', ['type']);
    await queryInterface.removeIndex('documents', ['traveler_id']);
    await queryInterface.dropTable('documents');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_documents_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_documents_status";');
  },
};

