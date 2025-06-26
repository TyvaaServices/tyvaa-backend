import { DataTypes, Op } from "sequelize";
import sequelize from "#config/db.js";
import Role from "./role.js";
/**
 * @typedef {import("sequelize").Model & {
 *   id: number,
 *   phoneNumber: string,
 *   fullName?: string,
 *   fcmToken?: string,
 *   profileImage?: string,
 *   sexe: "male" | "female",
 *   dateOfBirth?: Date,
 *   email?: string,
 *   isActive: boolean,
 *   isBlocked: boolean,
 *   latitude?: number,
 *   longitude?: number,
 *   lastLogin?: Date,
 *   getRoles: () => Promise<Role[]>,
 *   hasRole: (roleName: string) => Promise<boolean>,
 *   getPermissions: () => Promise<Permission[]>,
 *   hasPermission: (permissionName: string) => Promise<boolean>
 * }} UserInstance
 */

/**
 * @file Defines the User model, including attributes, associations, and instance methods for RBAC.
 * @typedef {Object} UserAttributes
 * @property {number} id - The unique identifier for the user.
 * @property {string} phoneNumber - The user's phone number (unique).
 * @property {string} [fullName] - The user's full name.
 * @property {string} [fcmToken] - Firebase Cloud Messaging token for push notifications.
 * @property {string} [profileImage] - URL or path to the user's profile image.
 * @property {("male"|"female"|"other"|"prefer_not_to_say")} sexe - The user's gender.
 * @property {Date} dateOfBirth - The user's date of birth.
 * @property {string} [email] - The user's email address (optional, could be unique if primary identifier).
 * @property {boolean} isActive - Flag indicating if the user's account is active. Defaults to false (e.g., pending OTP verification).
 * @property {boolean} isBlocked - Flag indicating if the user's account is blocked by an admin.
 * @property {number} [latitude] - Last known latitude of the user.
 * @property {number} [longitude] - Last known longitude of the user.
 * @property {Date} [lastLogin] - Timestamp of the user's last login.
 */

/**
 * Sequelize model for User.
 * Represents a user in the system with authentication details and profile information.
 * Includes instance methods for Role-Based Access Control (RBAC).
 * @type {import("sequelize").ModelCtor<import("sequelize").Model<UserAttributes, any> & UserInstanceMethods>}
 */

const User = sequelize.define(
    "User",
    {
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
                is: {
                    args: /^\+?[1-9]\d{1,14}$/,
                    msg: "Invalid phone number format.",
                },
            },
            comment:
                "User's primary phone number, used for login and communication. Must be unique.",
        },
        fullName: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "User's full name.",
        },
        fcmToken: {
            type: DataTypes.STRING,
            allowNull: true,
            comment:
                "Firebase Cloud Messaging (FCM) token for push notifications.",
        },
        profileImage: {
            type: DataTypes.STRING(512),
            allowNull: true,
            comment: "URL or path to the user's profile image.",
        },
        sexe: {
            type: DataTypes.ENUM("male", "female"),
            allowNull: false,
            comment: "Sex of the user.",
        },
        dateOfBirth: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: "User's date of birth.",
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            validate: {
                isEmail: {
                    msg: "Invalid email format.",
                },
            },
            comment: "User's email address. Optional, but unique if provided.",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            comment:
                "Indicates if the user's account is active and can log in.",
        },
        isBlocked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            comment:
                "Indicates if the user's account has been blocked by an administrator.",
        },
        latitude: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            validate: { isNumeric: true, min: -90, max: 90 },
            comment: "Last known latitude of the user.",
        },
        longitude: {
            // Last known location
            type: DataTypes.DOUBLE,
            allowNull: true,
            validate: { isNumeric: true, min: -180, max: 180 },
            comment: "Last known longitude of the user.",
        },
        lastLogin: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: "Timestamp of the user's last successful login.",
        },
    },
    {
        tableName: "Users",
        timestamps: true,
        paranoid: true,
        comment:
            "Stores user account information, including authentication details and profile data.",
        indexes: [
            {
                name: "idx_user_email",
                fields: ["email"],
                unique: true,
                where: { email: { [Op.ne]: null } },
            },
            {
                name: "idx_user_phonenumber",
                fields: ["phoneNumber"],
                unique: true,
            },
            {
                name: "idx_user_isactive_isblocked",
                fields: ["isActive", "isBlocked"],
            },
        ],
    }
);

User.belongsToMany(Role, {
    through: "UserRoles",
    as: "roles",
    foreignKey: "userId",
    otherKey: "roleId",
});

Role.belongsToMany(User, {
    through: "UserRoles",
    as: "users",
    foreignKey: "roleId",
    otherKey: "userId",
});

// --- RBAC Instance Methods ---
/**
 * @typedef {Object} UserInstanceMethods
 * @property {() => Promise<Role[]>} getRoles - Sequelize mixin to get associated roles.
 * @property {(roleName: string) => Promise<boolean>} hasRole - Checks if the user has a specific role.
 * @property {() => Promise<Permission[]>} getPermissions - Retrieves all unique permissions for the user via their roles.
 * @property {(permissionName: string) => Promise<boolean>} hasPermission - Checks if the user has a specific permission.
 */

/**
 * Checks if the user has a specific role by name.
 * @param {string} roleName - The name of the role to check.
 * @returns {Promise<boolean>} True if the user has the role, false otherwise.
 * @this UserAttributes & {getRoles: () => Promise<Array<RoleAttributes & {name: string}>>}
 */
User.prototype.hasRole = async function (roleName) {
    const roles = await this.getRoles();
    return roles.some((role) => role.name === roleName);
};

/**
 * Retrieves all unique permissions assigned to the user through their roles.
 * @returns {Promise<Permission[]>} An array of unique permission objects.
 * @this UserAttributes & {getRoles: () => Promise<Array<RoleAttributes & {getPermissions: () => Promise<Permission[]>}>>}
 */
User.prototype.getPermissions = async function () {
    const roles = await this.getRoles(); // Sequelize mixin
    const allPermissionsMap = new Map();

    for (const role of roles) {
        const permissions = await role.getPermissions(); // Sequelize mixin from Role.belongsToMany(Permission)
        for (const permission of permissions) {
            if (!allPermissionsMap.has(permission.id)) {
                // Use ID for uniqueness of permission objects
                allPermissionsMap.set(permission.id, permission);
            }
        }
    }
    return Array.from(allPermissionsMap.values());
};

/**
 * Checks if the user has a specific permission by name.
 * @param {string} permissionName - The name of the permission to check.
 * @returns {Promise<boolean>} True if the user has the permission, false otherwise.
 * @this UserAttributes & UserInstanceMethods
 */
User.prototype.hasPermission = async function (permissionName) {
    const permissions = await this.getPermissions(); // Uses the refined getPermissions above
    return permissions.some((permission) => permission.name === permissionName);
};

export default User;
