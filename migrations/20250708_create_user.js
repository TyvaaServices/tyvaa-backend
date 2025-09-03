export async function up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        phoneNumber: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
        },
        fullName: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        fcmToken: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        profileImage: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        sexe: {
            type: Sequelize.ENUM("male", "female"),
            allowNull: true,
        },
        dateOfBirth: {
            type: Sequelize.DATE,
            allowNull: true,
        },
        email: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        isActive: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        isBlocked: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        latitude: {
            type: Sequelize.FLOAT,
            allowNull: true,
        },
        longitude: {
            type: Sequelize.FLOAT,
            allowNull: true,
        },
        lastLogin: {
            type: Sequelize.DATE,
            allowNull: true,
        },
        appLanguage: {
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
    await queryInterface.dropTable("Users");
}
