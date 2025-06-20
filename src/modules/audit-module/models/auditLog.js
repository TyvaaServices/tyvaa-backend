const sequelize = require('./../../../config/db');
const {DataTypes} = require("sequelize");

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    entityId:{
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    entityType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    actionTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
        {
            fields: ['entityId', 'entityType'],
        },
        {
            name: 'idx_audit_logs_actionTypeId',
            fields: ['actionTypeId'],
        },
        {
            name: 'idx_audit_logs_entityType_entityId',
            fields: ['entityType', 'entityId'],
        },
    ],
});
module.exports = AuditLog;