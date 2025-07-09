export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("audit_actions", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        actionType: {
            type: Sequelize.ENUM(
                "create",
                "update",
                "delete",
                "view",
                "exportsData",
                "login",
                "logout"
            ),
            allowNull: false,
        },
        codeAction: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        },
    });
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable("audit_actions");
}
