module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('travelers', 'email', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn('travelers', 'phone', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn('travelers', 'passport_number', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn('travelers', 'emergency_contact_name', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn('travelers', 'emergency_contact_phone', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn('documents', 'identifier', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn('documents', 'file_url', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('travelers', 'email', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.changeColumn('travelers', 'phone', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    await queryInterface.changeColumn('travelers', 'passport_number', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.changeColumn('travelers', 'emergency_contact_name', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });

    await queryInterface.changeColumn('travelers', 'emergency_contact_phone', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    await queryInterface.changeColumn('documents', 'identifier', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.changeColumn('documents', 'file_url', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
};
