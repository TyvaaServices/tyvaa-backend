import User from "../models/user.js";
import Role from "../models/role.js";
import Permission from "../models/permission.js";
import sequelize from "#config/db.js"; // For transactions if needed

export const createRole = async (request, reply) => {
    try {
        const { name } = request.body;
        if (!name) {
            return reply
                .status(400)
                .send({ message: "Role name is required." });
        }
        const [role, created] = await Role.findOrCreate({ where: { name } });
        if (!created) {
            return reply
                .status(409)
                .send({ message: `Role '${name}' already exists.` });
        }
        return reply.status(201).send(role);
    } catch (error) {
        request.log.error(error, "Error creating role");
        return reply
            .status(500)
            .send({ message: "Internal Server Error creating role." });
    }
};

export const getAllRoles = async (request, reply) => {
    try {
        const roles = await Role.findAll({
            include: [{ model: Permission, as: "permissions" }],
        }); // Include permissions
        return reply.send(roles);
    } catch (error) {
        request.log.error(error, "Error fetching roles");
        return reply
            .status(500)
            .send({ message: "Internal Server Error fetching roles." });
    }
};

export const getRoleById = async (request, reply) => {
    try {
        const role = await Role.findByPk(request.params.roleId, {
            include: [{ model: Permission, through: { attributes: [] } }],
        });
        if (!role) {
            return reply.status(404).send({ message: "Role not found." });
        }
        return reply.send(role);
    } catch (error) {
        request.log.error(error, "Error fetching role by ID");
        return reply
            .status(500)
            .send({ message: "Internal Server Error fetching role." });
    }
};

export const deleteRole = async (request, reply) => {
    const transaction = await sequelize.transaction();
    try {
        const roleId = request.params.roleId;
        const role = await Role.findByPk(roleId, { transaction });
        if (!role) {
            await transaction.rollback();
            return reply.status(404).send({ message: "Role not found." });
        }

        const usersWithRole = await role.getUsers({ transaction }); // getUsers is a Sequelize mixin
        if (usersWithRole.length > 0) {
            await transaction.rollback();
            return reply.status(400).send({
                message: `Role '${role.name}' cannot be deleted as it is assigned to ${usersWithRole.length} user(s).`,
            });
        }

        await role.setPermissions([], { transaction }); // Remove all permissions associated with the role first
        await role.destroy({ transaction });
        await transaction.commit();
        return reply.status(204).send();
    } catch (error) {
        await transaction.rollback();
        request.log.error(error, "Error deleting role");
        return reply
            .status(500)
            .send({ message: "Internal Server Error deleting role." });
    }
};

export const createPermission = async (request, reply) => {
    try {
        const { name, description } = request.body;
        if (!name) {
            return reply
                .status(400)
                .send({ message: "Permission name is required." });
        }
        const [permission, created] = await Permission.findOrCreate({
            where: { name },
            defaults: { description },
        });
        if (!created) {
            return reply
                .status(409)
                .send({ message: `Permission '${name}' already exists.` });
        }
        return reply.status(201).send(permission);
    } catch (error) {
        request.log.error(error, "Error creating permission");
        return reply
            .status(500)
            .send({ message: "Internal Server Error creating permission." });
    }
};

export const getAllPermissions = async (request, reply) => {
    try {
        const permissions = await Permission.findAll();
        return reply.send(permissions);
    } catch (error) {
        request.log.error(error, "Error fetching permissions");
        return reply
            .status(500)
            .send({ message: "Internal Server Error fetching permissions." });
    }
};

export const assignPermissionToRole = async (request, reply) => {
    try {
        const { roleId, permissionId } = request.params;
        const role = await Role.findByPk(roleId);
        const permission = await Permission.findByPk(permissionId);

        if (!role)
            return reply.status(404).send({ message: "Role not found." });
        if (!permission)
            return reply.status(404).send({ message: "Permission not found." });

        await role.addPermission(permission);
        return reply.status(200).send({
            message: `Permission '${permission.name}' assigned to role '${role.name}'.`,
        });
    } catch (error) {
        request.log.error(error, "Error assigning permission to role");
        return reply
            .status(500)
            .send({ message: "Internal Server Error assigning permission." });
    }
};

export const removePermissionFromRole = async (request, reply) => {
    try {
        const { roleId, permissionId } = request.params;
        const role = await Role.findByPk(roleId);
        const permission = await Permission.findByPk(permissionId);

        if (!role)
            return reply.status(404).send({ message: "Role not found." });
        if (!permission)
            return reply.status(404).send({ message: "Permission not found." });

        await role.removePermission(permission); // removePermission is a Sequelize mixin
        return reply.status(200).send({
            message: `Permission '${permission.name}' removed from role '${role.name}'.`,
        });
    } catch (error) {
        request.log.error(error, "Error removing permission from role");
        return reply
            .status(500)
            .send({ message: "Internal Server Error removing permission." });
    }
};

export const assignRoleToUser = async (request, reply) => {
    try {
        const { userId, roleId } = request.params;
        const user = await User.findByPk(userId);
        const role = await Role.findByPk(roleId);

        if (!user)
            return reply.status(404).send({ message: "User not found." });
        if (!role)
            return reply.status(404).send({ message: "Role not found." });

        await user.addRole(role);
        return reply.status(200).send({
            message: `Role '${role.name}' assigned to user ID ${user.id}.`,
        });
    } catch (error) {
        request.log.error(error, "Error assigning role to user");
        return reply
            .status(500)
            .send({ message: "Internal Server Error assigning role." });
    }
};

export const removeRoleFromUser = async (request, reply) => {
    try {
        const { userId, roleId } = request.params;
        const user = await User.findByPk(userId);
        const role = await Role.findByPk(roleId);

        if (!user)
            return reply.status(404).send({ message: "User not found." });
        if (!role)
            return reply.status(404).send({ message: "Role not found." });

        await user.removeRole(role); // removeRole is a Sequelize mixin
        return reply.status(200).send({
            message: `Role '${role.name}' removed from user ID ${user.id}.`,
        });
    } catch (error) {
        request.log.error(error, "Error removing role from user");
        return reply
            .status(500)
            .send({ message: "Internal Server Error removing role." });
    }
};

export const getUserRoles = async (request, reply) => {
    try {
        const user = await User.findByPk(request.params.userId, {
            include: [{ model: Role, through: { attributes: [] } }], // include roles, not the join table attributes
        });
        if (!user) {
            return reply.status(404).send({ message: "User not found." });
        }
        return reply.send(user.Roles);
    } catch (error) {
        request.log.error(error, "Error fetching user roles");
        return reply
            .status(500)
            .send({ message: "Internal Server Error fetching user roles." });
    }
};
