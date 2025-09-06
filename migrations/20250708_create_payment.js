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
        },
        externalTransactionId: {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true,
        },
        bookingId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: "Bookings",
                key: "id",
            },
        },
        phone: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
        },
        fee: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
        },
        status: {
            type: Sequelize.ENUM(
                "pending",
                "processing",
                "completed",
                "failed",
                "cancelled"
            ),
            allowNull: false,
            defaultValue: "pending",
        },
        currency: {
            type: Sequelize.STRING(3),
            allowNull: false,
            defaultValue: "XOF",
        },
        paymentMethod: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        provider: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "dexchange",
        },
        metadata: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        operatorId: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        paymentUrl: {
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

    // Add indexes for better performance
    await queryInterface.addIndex("Payments", ["bookingId"]);
    await queryInterface.addIndex("Payments", ["status"]);
    await queryInterface.addIndex("Payments", ["provider"]);
    await queryInterface.addIndex("Payments", ["paymentMethod"]);
    await queryInterface.addIndex("Payments", ["createdAt"]);
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Payments");
}
