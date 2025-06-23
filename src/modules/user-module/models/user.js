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

// Late import to avoid circular dependencies if Role imports User (though not in this case)
// and to ensure sequelize instance is the same.
// However, for model associations, it's common to import at the top.
// Let's adjust if issues arise, but this should be fine.
import Role from './role.js';

// Define Many-to-Many relationship between User and Role
// This will create a join table `UserRoles`
User.belongsToMany(Role, {
    through: 'UserRoles',
    foreignKey: 'userId',
    otherKey: 'roleId',
    timestamps: false, // No timestamps for the join table itself
});

Role.belongsToMany(User, {
    through: 'UserRoles',
    foreignKey: 'roleId',
    otherKey: 'userId',
    timestamps: false,
});

// Instance methods for checking roles and permissions
// User.getRoles() is automatically provided by Sequelize as a mixin.

User.prototype.hasRole = async function(roleName) {
    const roles = await this.getRoles(); // Uses the Sequelize mixin
    return roles.some(role => role.name === roleName);
};

User.prototype.getPermissions = async function() {
    const roles = await this.getRoles(); // Uses the Sequelize mixin
    let allPermissions = [];
    for (const role of roles) {
        // Role model needs to be imported here to access its prototype methods if any,
        // or ensure `role.getPermissions()` is correctly provided by its own associations.
        // `role.getPermissions()` is a Sequelize mixin from Role.belongsToMany(Permission)
        const permissions = await role.getPermissions();
        allPermissions = allPermissions.concat(permissions);
    }
    // Remove duplicates: convert to Set of names, then map back to unique permission objects
    const permissionNames = new Set(allPermissions.map(p => p.name));
    // Ensure we return full permission objects if needed, or just names.
    // The original plan was to return objects.
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
