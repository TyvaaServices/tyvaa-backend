export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("landmarks", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        latitude: {
            type: Sequelize.FLOAT,
            allowNull: false,
        },
        longitude: {
            type: Sequelize.FLOAT,
            allowNull: false,
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("landmarks");
}
