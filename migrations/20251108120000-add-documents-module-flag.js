'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trips', 'documents_module_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.sequelize.query(`
      UPDATE trips
      SET documents_module_enabled = true
      WHERE id IN (
        SELECT DISTINCT travelers.trip_id
        FROM travelers
        INNER JOIN documents ON documents.traveler_id = travelers.id
        WHERE documents.deleted_at IS NULL
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trips', 'documents_module_enabled');
  },
};
