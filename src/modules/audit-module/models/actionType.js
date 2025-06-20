import sequelize from './../../../config/db.js';
import {DataTypes} from "sequelize";

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

export default { AuditAction};