import { describe, expect, it, jest } from "@jest/globals";
import {
    createRole,
    getAllRoles,
    getRoleById,
    deleteRole,
    createPermission,
    getAllPermissions,
    assignPermissionToRole,
    removePermissionFromRole,
    assignRoleToUser,
    removeRoleFromUser,
    getUserRoles,
} from "../../src/modules/user-module/controllers/adminController.js";
import User from "../../src/modules/user-module/models/user.js";
import Role from "../../src/modules/user-module/models/role.js";
import Permission from "../../src/modules/user-module/models/permission.js";
import sequelize from "../../src/config/db.js";

jest.mock("../../src/modules/user-module/models/user.js");
jest.mock("../../src/modules/user-module/models/role.js");
jest.mock("../../src/modules/user-module/models/permission.js");
jest.mock("../../src/config/db.js");

describe("Admin Controller", () => {
    let mockRequest;
    let mockReply;

    beforeEach(() => {
        mockRequest = {
            body: {},
            params: {},
            log: {
                error: jest.fn(),
            },
        };
        mockReply = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        User.findByPk = jest.fn();
        User.prototype.addRole = jest.fn();
        User.prototype.removeRole = jest.fn();

        Role.findOrCreate = jest.fn();
        Role.findAll = jest.fn();
        Role.findByPk = jest.fn();
        Role.prototype.destroy = jest.fn();
        Role.prototype.getUsers = jest.fn();
        Role.prototype.setPermissions = jest.fn();
        Role.prototype.addPermission = jest.fn();
        Role.prototype.removePermission = jest.fn();

        Permission.findOrCreate = jest.fn();
        Permission.findAll = jest.fn();
        Permission.findByPk = jest.fn();

        sequelize.transaction = jest.fn();
    });

    describe("createRole", () => {
        it("should create a role successfully", async () => {
            mockRequest.body.name = "Admin";
            Role.findOrCreate.mockResolvedValue([
                { id: 1, name: "Admin" },
                true,
            ]);
            await createRole(mockRequest, mockReply);
            expect(Role.findOrCreate).toHaveBeenCalledWith({
                where: { name: "Admin" },
            });
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({
                id: 1,
                name: "Admin",
            });
        });

        it("should return 400 if role name is missing", async () => {
            await createRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role name is required.",
            });
        });

        it("should return 409 if role already exists", async () => {
            mockRequest.body.name = "Admin";
            Role.findOrCreate.mockResolvedValue([
                { id: 1, name: "Admin" },
                false,
            ]);
            await createRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role 'Admin' already exists.",
            });
        });

        it("should return 500 on error", async () => {
            mockRequest.body.name = "Admin";
            Role.findOrCreate.mockRejectedValue(new Error("DB Error"));
            await createRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error creating role.",
            });
        });
    });

    describe("getAllRoles", () => {
        it("should return all roles", async () => {
            const roles = [{ id: 1, name: "Admin" }];
            Role.findAll.mockResolvedValue(roles);
            await getAllRoles(mockRequest, mockReply);
            expect(Role.findAll).toHaveBeenCalledWith({
                include: [{ model: Permission, through: { attributes: [] } }],
            });
            expect(mockReply.send).toHaveBeenCalledWith(roles);
        });

        it("should return 500 on error", async () => {
            Role.findAll.mockRejectedValue(new Error("DB Error"));
            await getAllRoles(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error fetching roles.",
            });
        });
    });

    describe("getRoleById", () => {
        it("should return a role by ID", async () => {
            mockRequest.params.roleId = 1;
            const role = { id: 1, name: "Admin" };
            Role.findByPk.mockResolvedValue(role);
            await getRoleById(mockRequest, mockReply);
            expect(Role.findByPk).toHaveBeenCalledWith(1, {
                include: [{ model: Permission, through: { attributes: [] } }],
            });
            expect(mockReply.send).toHaveBeenCalledWith(role);
        });

        it("should return 404 if role not found", async () => {
            mockRequest.params.roleId = 1;
            Role.findByPk.mockResolvedValue(null);
            await getRoleById(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role not found.",
            });
        });

        it("should return 500 on error", async () => {
            mockRequest.params.roleId = 1;
            Role.findByPk.mockRejectedValue(new Error("DB Error"));
            await getRoleById(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error fetching role.",
            });
        });
    });

    describe("deleteRole", () => {
        let mockTransaction;

        beforeEach(() => {
            mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn(),
            };
            sequelize.transaction.mockResolvedValue(mockTransaction);
        });

        it("should delete a role successfully", async () => {
            mockRequest.params.roleId = 1;
            const mockRoleInstance = {
                id: 1,
                name: "Tester",
                getUsers: jest.fn().mockResolvedValue([]),
                setPermissions: jest.fn().mockResolvedValue(undefined),
                destroy: jest.fn().mockResolvedValue(undefined),
            };
            Role.findByPk.mockResolvedValue(mockRoleInstance);

            await deleteRole(mockRequest, mockReply);

            expect(Role.findByPk).toHaveBeenCalledWith(1, {
                transaction: mockTransaction,
            });
            expect(mockRoleInstance.getUsers).toHaveBeenCalledWith({
                transaction: mockTransaction,
            });
            expect(mockRoleInstance.setPermissions).toHaveBeenCalledWith([], {
                transaction: mockTransaction,
            });
            expect(mockRoleInstance.destroy).toHaveBeenCalledWith({
                transaction: mockTransaction,
            });
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalled();
        });

        it("should return 404 if role not found", async () => {
            mockRequest.params.roleId = 1;
            Role.findByPk.mockResolvedValue(null);
            await deleteRole(mockRequest, mockReply);
            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role not found.",
            });
        });

        it("should return 400 if role is assigned to users", async () => {
            mockRequest.params.roleId = 1;
            const mockRoleInstance = {
                id: 1,
                name: "Tester",
                getUsers: jest
                    .fn()
                    .mockResolvedValue([{ id: 1, name: "User1" }]), // Role assigned to a user
            };
            Role.findByPk.mockResolvedValue(mockRoleInstance);

            await deleteRole(mockRequest, mockReply);

            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                message:
                    "Role 'Tester' cannot be deleted as it is assigned to 1 user(s).",
            });
        });

        it("should return 500 on error during findByPk", async () => {
            mockRequest.params.roleId = 1;
            Role.findByPk.mockRejectedValue(new Error("DB Error"));
            await deleteRole(mockRequest, mockReply);
            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error deleting role.",
            });
        });

        it("should return 500 on error during getUsers", async () => {
            mockRequest.params.roleId = 1;
            const mockRoleInstance = {
                id: 1,
                name: "Tester",
                getUsers: jest.fn().mockRejectedValue(new Error("DB Error")),
            };
            Role.findByPk.mockResolvedValue(mockRoleInstance);
            await deleteRole(mockRequest, mockReply);
            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error deleting role.",
            });
        });

        it("should return 500 on error during setPermissions", async () => {
            mockRequest.params.roleId = 1;
            const mockRoleInstance = {
                id: 1,
                name: "Tester",
                getUsers: jest.fn().mockResolvedValue([]),
                setPermissions: jest
                    .fn()
                    .mockRejectedValue(new Error("DB Error")),
            };
            Role.findByPk.mockResolvedValue(mockRoleInstance);
            await deleteRole(mockRequest, mockReply);
            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error deleting role.",
            });
        });

        it("should return 500 on error during destroy", async () => {
            mockRequest.params.roleId = 1;
            const mockRoleInstance = {
                id: 1,
                name: "Tester",
                getUsers: jest.fn().mockResolvedValue([]),
                setPermissions: jest.fn().mockResolvedValue(undefined),
                destroy: jest.fn().mockRejectedValue(new Error("DB Error")),
            };
            Role.findByPk.mockResolvedValue(mockRoleInstance);
            await deleteRole(mockRequest, mockReply);
            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error deleting role.",
            });
        });
    });

    describe("createPermission", () => {
        it("should create a permission successfully", async () => {
            mockRequest.body = {
                name: "edit_post",
                description: "Can edit posts",
            };
            Permission.findOrCreate.mockResolvedValue([
                { id: 1, name: "edit_post" },
                true,
            ]);
            await createPermission(mockRequest, mockReply);
            expect(Permission.findOrCreate).toHaveBeenCalledWith({
                where: { name: "edit_post" },
                defaults: { description: "Can edit posts" },
            });
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({
                id: 1,
                name: "edit_post",
            });
        });

        it("should return 400 if permission name is missing", async () => {
            await createPermission(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Permission name is required.",
            });
        });

        it("should return 409 if permission already exists", async () => {
            mockRequest.body = { name: "edit_post" };
            Permission.findOrCreate.mockResolvedValue([
                { id: 1, name: "edit_post" },
                false,
            ]);
            await createPermission(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Permission 'edit_post' already exists.",
            });
        });

        it("should return 500 on error", async () => {
            mockRequest.body = { name: "edit_post" };
            Permission.findOrCreate.mockRejectedValue(new Error("DB Error"));
            await createPermission(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error creating permission.",
            });
        });
    });

    describe("getAllPermissions", () => {
        it("should return all permissions", async () => {
            const permissions = [{ id: 1, name: "edit_post" }];
            Permission.findAll.mockResolvedValue(permissions);
            await getAllPermissions(mockRequest, mockReply);
            expect(Permission.findAll).toHaveBeenCalled();
            expect(mockReply.send).toHaveBeenCalledWith(permissions);
        });

        it("should return 500 on error", async () => {
            Permission.findAll.mockRejectedValue(new Error("DB Error"));
            await getAllPermissions(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error fetching permissions.",
            });
        });
    });

    describe("assignPermissionToRole", () => {
        it("should assign permission to role successfully", async () => {
            mockRequest.params = { roleId: 1, permissionId: 1 };
            const mockRole = {
                id: 1,
                name: "Admin",
                addPermission: jest.fn().mockResolvedValue(undefined),
            };
            const mockPermission = { id: 1, name: "edit_post" };
            Role.findByPk.mockResolvedValue(mockRole);
            Permission.findByPk.mockResolvedValue(mockPermission);

            await assignPermissionToRole(mockRequest, mockReply);

            expect(Role.findByPk).toHaveBeenCalledWith(1);
            expect(Permission.findByPk).toHaveBeenCalledWith(1);
            expect(mockRole.addPermission).toHaveBeenCalledWith(mockPermission);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Permission 'edit_post' assigned to role 'Admin'.",
            });
        });

        it("should return 404 if role not found", async () => {
            mockRequest.params = { roleId: 1, permissionId: 1 };
            Role.findByPk.mockResolvedValue(null);
            Permission.findByPk.mockResolvedValue({ id: 1, name: "edit_post" });
            await assignPermissionToRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role not found.",
            });
        });

        it("should return 404 if permission not found", async () => {
            mockRequest.params = { roleId: 1, permissionId: 1 };
            Role.findByPk.mockResolvedValue({ id: 1, name: "Admin" });
            Permission.findByPk.mockResolvedValue(null);
            await assignPermissionToRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Permission not found.",
            });
        });

        it("should return 500 on error", async () => {
            mockRequest.params = { roleId: 1, permissionId: 1 };
            Role.findByPk.mockRejectedValue(new Error("DB Error"));
            await assignPermissionToRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error assigning permission.",
            });
        });
    });

    describe("removePermissionFromRole", () => {
        it("should remove permission from role successfully", async () => {
            mockRequest.params = { roleId: 1, permissionId: 1 };
            const mockRole = {
                id: 1,
                name: "Admin",
                removePermission: jest.fn().mockResolvedValue(undefined),
            };
            const mockPermission = { id: 1, name: "edit_post" };
            Role.findByPk.mockResolvedValue(mockRole);
            Permission.findByPk.mockResolvedValue(mockPermission);

            await removePermissionFromRole(mockRequest, mockReply);

            expect(mockRole.removePermission).toHaveBeenCalledWith(
                mockPermission
            );
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Permission 'edit_post' removed from role 'Admin'.",
            });
        });

        it("should return 404 if role not found", async () => {
            mockRequest.params = { roleId: 1, permissionId: 1 };
            Role.findByPk.mockResolvedValue(null);
            Permission.findByPk.mockResolvedValue({ id: 1, name: "edit_post" });
            await removePermissionFromRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role not found.",
            });
        });

        it("should return 404 if permission not found", async () => {
            mockRequest.params = { roleId: 1, permissionId: 1 };
            Role.findByPk.mockResolvedValue({ id: 1, name: "Admin" });
            Permission.findByPk.mockResolvedValue(null);
            await removePermissionFromRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Permission not found.",
            });
        });

        it("should return 500 on error", async () => {
            mockRequest.params = { roleId: 1, permissionId: 1 };
            Role.findByPk.mockResolvedValue({
                id: 1,
                name: "Admin",
                removePermission: jest
                    .fn()
                    .mockRejectedValue(new Error("DB Error")),
            });
            Permission.findByPk.mockResolvedValue({ id: 1, name: "edit_post" });
            await removePermissionFromRole(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error removing permission.",
            });
        });
    });

    describe("assignRoleToUser", () => {
        it("should assign role to user successfully", async () => {
            mockRequest.params = { userId: 1, roleId: 1 };
            const mockUser = {
                id: 1,
                addRole: jest.fn().mockResolvedValue(undefined),
            };
            const mockRole = { id: 1, name: "Admin" };
            User.findByPk.mockResolvedValue(mockUser);
            Role.findByPk.mockResolvedValue(mockRole);

            await assignRoleToUser(mockRequest, mockReply);

            expect(User.findByPk).toHaveBeenCalledWith(1);
            expect(Role.findByPk).toHaveBeenCalledWith(1);
            expect(mockUser.addRole).toHaveBeenCalledWith(mockRole);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role 'Admin' assigned to user ID 1.",
            });
        });

        it("should return 404 if user not found", async () => {
            mockRequest.params = { userId: 1, roleId: 1 };
            User.findByPk.mockResolvedValue(null);
            Role.findByPk.mockResolvedValue({ id: 1, name: "Admin" });
            await assignRoleToUser(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "User not found.",
            });
        });

        it("should return 404 if role not found", async () => {
            mockRequest.params = { userId: 1, roleId: 1 };
            User.findByPk.mockResolvedValue({ id: 1 });
            Role.findByPk.mockResolvedValue(null);
            await assignRoleToUser(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role not found.",
            });
        });

        it("should return 500 on error", async () => {
            mockRequest.params = { userId: 1, roleId: 1 };
            User.findByPk.mockRejectedValue(new Error("DB Error"));
            await assignRoleToUser(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error assigning role.",
            });
        });
    });

    describe("removeRoleFromUser", () => {
        it("should remove role from user successfully", async () => {
            mockRequest.params = { userId: 1, roleId: 1 };
            const mockUser = {
                id: 1,
                removeRole: jest.fn().mockResolvedValue(undefined),
            };
            const mockRole = { id: 1, name: "Admin" };
            User.findByPk.mockResolvedValue(mockUser);
            Role.findByPk.mockResolvedValue(mockRole);

            await removeRoleFromUser(mockRequest, mockReply);

            expect(mockUser.removeRole).toHaveBeenCalledWith(mockRole);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role 'Admin' removed from user ID 1.",
            });
        });

        it("should return 404 if user not found", async () => {
            mockRequest.params = { userId: 1, roleId: 1 };
            User.findByPk.mockResolvedValue(null);
            Role.findByPk.mockResolvedValue({ id: 1, name: "Admin" });
            await removeRoleFromUser(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "User not found.",
            });
        });

        it("should return 404 if role not found", async () => {
            mockRequest.params = { userId: 1, roleId: 1 };
            User.findByPk.mockResolvedValue({ id: 1 });
            Role.findByPk.mockResolvedValue(null);
            await removeRoleFromUser(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Role not found.",
            });
        });

        it("should return 500 on error", async () => {
            mockRequest.params = { userId: 1, roleId: 1 };
            User.findByPk.mockResolvedValue({
                id: 1,
                removeRole: jest.fn().mockRejectedValue(new Error("DB Error")),
            });
            Role.findByPk.mockResolvedValue({ id: 1, name: "Admin" });
            await removeRoleFromUser(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error removing role.",
            });
        });
    });

    describe("getUserRoles", () => {
        it("should return user roles successfully", async () => {
            mockRequest.params.userId = 1;
            const userWithRoles = { id: 1, Roles: [{ id: 1, name: "Admin" }] };
            User.findByPk.mockResolvedValue(userWithRoles);

            await getUserRoles(mockRequest, mockReply);

            expect(User.findByPk).toHaveBeenCalledWith(1, {
                include: [{ model: Role, through: { attributes: [] } }],
            });
            expect(mockReply.send).toHaveBeenCalledWith(userWithRoles.Roles);
        });

        it("should return 404 if user not found", async () => {
            mockRequest.params.userId = 1;
            User.findByPk.mockResolvedValue(null);
            await getUserRoles(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "User not found.",
            });
        });

        it("should return 500 on error", async () => {
            mockRequest.params.userId = 1;
            User.findByPk.mockRejectedValue(new Error("DB Error"));
            await getUserRoles(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error fetching user roles.",
            });
        });
    });
});
