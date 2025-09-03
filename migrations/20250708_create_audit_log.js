export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("AuditLogs", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        entityId: {
            type: Sequelize.INTEGER,
            allowNull: true,
        },
        entityType: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        description: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        actionTypeId: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        ipAddress: {
            type: Sequelize.STRING,
            allowNull: true,
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("AuditLogs");
}
