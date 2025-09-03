export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("RideInstances", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        rideId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: "rides",
                key: "id",
            },
        },
        rideDate: {
            type: Sequelize.DATE,
            allowNull: false,
        },
        seatsAvailable: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        seatsBooked: {
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        status: {
            type: Sequelize.ENUM("scheduled", "cancelled", "completed"),
            allowNull: false,
            defaultValue: "scheduled",
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("RideInstances");
}
