import {DataTypes} from 'sequelize';
import sequelize from '#config/db.js';

const DriverApplication = sequelize.define('DriverApplication', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
    },
    applicationDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    documents: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    comments: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'DriverApplications',
    timestamps: true,
});

export default DriverApplication;
