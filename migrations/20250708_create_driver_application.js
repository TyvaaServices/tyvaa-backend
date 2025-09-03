export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("DriverApplications", {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        status: {
            type: Sequelize.ENUM("pending", "approved", "rejected"),
            defaultValue: "pending",
            allowNull: false,
        },
        applicationDate: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
            allowNull: false,
        },
        documents: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        comments: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
        },
        updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("DriverApplications");
}
