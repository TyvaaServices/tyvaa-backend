const sequelize = require('./../../../config/db');
const {DataTypes} = require("sequelize");

const AuditAction = sequelize.define('AuditAction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    actionType: {
        type: DataTypes.ENUM('create', 'update', 'delete', 'view','exportsData','login', 'logout'),
        allowNull: false,
    },
    codeAction:{
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
}, {
    tableName: 'audit_actions',
    timestamps: false,
});

module.exports= AuditAction;