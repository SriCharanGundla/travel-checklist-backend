'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('travelers', 'contact_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'traveler_contacts',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('travelers', ['trip_id', 'contact_id'], {
      name: 'travelers_trip_id_contact_id_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('travelers', 'travelers_trip_id_contact_id_unique');
    await queryInterface.removeColumn('travelers', 'contact_id');
  },
};
