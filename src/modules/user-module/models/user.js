import { DataTypes } from 'sequelize';
import sequelize from '#config/db.js';

const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                is: /^\+?[1-9]\d{1,14}$/,
            },
        },
        fullName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        fcmToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        profileImage: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        sexe: {
            type: DataTypes.ENUM('male', 'female'),
            allowNull: false,
        },
        dateOfBirth: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    isAdmin: {
            type:DataTypes.BOOLEAN,
            defaultValue: false,
    },
        latitude: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        longitude: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
)



export default User;
