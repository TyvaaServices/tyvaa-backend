export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("Payments", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        transactionId: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            field: "transaction_id",
        },
        bookingId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: "bookings",
                key: "id",
            },
        },
        phone: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        amount: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        status: {
            type: Sequelize.ENUM("PENDING", "COMPLETED", "FAILED", "CANCELLED"),
            allowNull: false,
            defaultValue: "PENDING",
        },
        currency: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        paymentMethod: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        metadata: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        operatorId: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Payments");
}
