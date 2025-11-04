'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex('travelers', 'travelers_trip_id_contact_id_unique');

    await queryInterface.addIndex('travelers', ['trip_id', 'contact_id'], {
      name: 'travelers_trip_id_contact_id_unique',
      unique: true,
      where: {
        deleted_at: {
          [Sequelize.Op.is]: null,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('travelers', 'travelers_trip_id_contact_id_unique');

    await queryInterface.addIndex('travelers', ['trip_id', 'contact_id'], {
      name: 'travelers_trip_id_contact_id_unique',
      unique: true,
    });
  },
};

