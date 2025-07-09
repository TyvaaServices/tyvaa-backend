export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("RideModels", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        driverId: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        departure: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        destination: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        seatsAvailable: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        recurrence: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
        },
        comment: {
            type: Sequelize.TEXT,
            defaultValue: "",
        },
        price: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        status: {
            type: Sequelize.ENUM("active", "cancelled", "completed"),
            allowNull: false,
            defaultValue: "active",
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("RideModels");
}
