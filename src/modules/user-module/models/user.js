import {DataTypes} from 'sequelize';
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
        // isAdmin field is removed in favor of RBAC
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

import Role from './role.js';

User.belongsToMany(Role, {
    through: 'UserRoles',
    foreignKey: 'userId',
    otherKey: 'roleId',
    timestamps: false,
});

Role.belongsToMany(User, {
    through: 'UserRoles',
    foreignKey: 'roleId',
    otherKey: 'userId',
    timestamps: false,
});

User.prototype.hasRole = async function(roleName) {
    const roles = await this.getRoles();
    return roles.some(role => role.name === roleName);
};

User.prototype.getPermissions = async function() {
    const roles = await this.getRoles(); // Uses the Sequelize mixin
    let allPermissions = [];
    for (const role of roles) {
        const permissions = await role.getPermissions();
        allPermissions = allPermissions.concat(permissions);
    }
    const permissionNames = new Set(allPermissions.map(p => p.name));
    return allPermissions.filter((permission, index, self) =>
        index === self.findIndex((p) => p.name === permission.name)
    );
};

User.prototype.hasPermission = async function(permissionName) {
    const roles = await this.getRoles(); // Uses the Sequelize mixin
    for (const role of roles) {
        const permissions = await role.getPermissions(); // Mixin from Role.belongsToMany(Permission)
        if (permissions.some(permission => permission.name === permissionName)) {
            return true;
        }
    }
    return false;
};

export default User;
