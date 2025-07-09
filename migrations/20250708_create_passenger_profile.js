export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("PassengerProfile", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        passengerNote: {
            type: Sequelize.FLOAT,
            allowNull: true,
            defaultValue: 0.0,
        },
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            unique: true,
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("PassengerProfile");
}
