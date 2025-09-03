export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("ProfilChauffeur", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        driverNote: {
            type: Sequelize.FLOAT,
            allowNull: true,
            defaultValue: 0.0,
        },
        statusProfile: {
            type: Sequelize.ENUM("Active", "Suspended"),
            allowNull: false,
        },
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            unique: true,
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ProfilChauffeur");
}
