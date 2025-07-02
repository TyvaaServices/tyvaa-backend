import {
    beforeEach,
    describe,
    expect,
    it,
    jest,
    beforeAll,
} from "@jest/globals";

import User from "../../src/modules/user-module/models/user.js";

jest.mock("../../src/modules/user-module/models/user.js");

const mockRoleFindAllFn = jest.fn();

let rbacPluginFp;
let ActualRole;

describe("RBAC Plugin", () => {
    let mockFastify;
    let mockRequest;
    let mockReply;
    let checkPermissionHandler;
    let checkRoleHandler;
    let roleFindAllSpy;

    beforeAll(async () => {
        const rbacModule = await import("../../src/utils/rbacPlugin.js");
        rbacPluginFp = rbacModule.default;

        ActualRole = (await import("#config/index.js")).Role;
    });

    beforeEach(async () => {
        if (roleFindAllSpy) {
            roleFindAllSpy.mockRestore();
        }
        roleFindAllSpy = jest.spyOn(ActualRole, "findAll");

        mockFastify = {
            decorate: jest.fn((name, funcFactory) => {
                if (name === "checkPermission") {
                    checkPermissionHandler = funcFactory("test_permission");
                }
                if (name === "checkRole") {
                    checkRoleHandler = funcFactory("test_role");
                }
            }),
        };

        mockRequest = {
            user: { id: 1, roles: [] },
            log: {
                warn: jest.fn(),
                error: jest.fn(),
                info: jest.fn(),
            },
        };
        mockReply = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await rbacPluginFp(mockFastify, {});
    });

    it("should decorate fastify with checkPermission and checkRole factories", () => {
        expect(mockFastify.decorate).toHaveBeenCalledWith(
            "checkPermission",
            expect.any(Function)
        );
        expect(mockFastify.decorate).toHaveBeenCalledWith(
            "checkRole",
            expect.any(Function)
        );
    });

    describe("checkPermission Handler", () => {
        it("should return 401 if no user on request", async () => {
            mockRequest.user = null;
            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(401);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Unauthorized. Authentication required.",
            });
            expect(mockRequest.log.warn).toHaveBeenCalledWith(
                "RBAC: No user found on request. Ensure authentication runs before permission check."
            );
        });

        it("should return 403 if user.roles is missing in JWT for permission check", async () => {
            mockRequest.user = { id: 1 };
            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                message:
                    "Forbidden. User roles not available in token for permission check.",
            });
            expect(mockRequest.log.warn).toHaveBeenCalledWith(
                "RBAC: Roles not found or not an array in JWT payload for user ID 1 (permission check)."
            );
        });

        it("should return 403 if user.roles is not an array in JWT for permission check", async () => {
            mockRequest.user = { id: 1, roles: "not_an_array" };
            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                message:
                    "Forbidden. User roles not available in token for permission check.",
            });
        });

        it("should return 500 if User model check fails (e.g. User.findByPk is not a function)", async () => {
            mockRequest.user.roles = ["some_role"];
            const originalUserFindByPk = User.findByPk;
            User.findByPk = undefined;

            await checkPermissionHandler(mockRequest, mockReply);

            User.findByPk = originalUserFindByPk;

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error: RBAC configuration issue.",
            });
            expect(mockRequest.log.error).toHaveBeenCalledWith(
                "RBAC: User model not found on fastify.models. Ensure models are registered."
            );
        });

        it("should return 403 if user's roles from JWT do not grant the required permission", async () => {
            mockRequest.user.roles = ["role_without_permission"];
            roleFindAllSpy.mockResolvedValue([]);

            await checkPermissionHandler(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Forbidden. Required permission: 'test_permission'.",
            });
            expect(roleFindAllSpy).toHaveBeenCalledWith({
                where: { name: ["role_without_permission"] },
                include: [
                    {
                        association: "Permissions",
                        where: { name: "test_permission" },
                        required: true,
                    },
                ],
            });
            expect(mockRequest.log.info).toHaveBeenCalledWith(
                "RBAC: User 1 (roles: role_without_permission) denied access to resource requiring permission 'test_permission'."
            );
        });

        it("should proceed if user's roles from JWT grant the required permission", async () => {
            mockRequest.user.roles = ["role_with_permission"];

            roleFindAllSpy.mockResolvedValue([
                {
                    name: "role_with_permission",
                    Permissions: [{ name: "test_permission" }],
                },
            ]);

            await checkPermissionHandler(mockRequest, mockReply);

            expect(mockReply.status).not.toHaveBeenCalled();
            expect(mockReply.send).not.toHaveBeenCalled();
            expect(roleFindAllSpy).toHaveBeenCalledWith({
                where: { name: ["role_with_permission"] },
                include: [
                    {
                        association: "Permissions",
                        where: { name: "test_permission" },
                        required: true,
                    },
                ],
            });
        });

        it("should return 403 if user has no roles in JWT", async () => {
            mockRequest.user.roles = [];

            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Forbidden. Required permission: 'test_permission'.",
            });
            expect(mockRequest.log.info).toHaveBeenCalledWith(
                "RBAC: User 1 (roles: ) denied access to resource requiring permission 'test_permission'."
            );
        });

        it("should handle errors from Role.findAll", async () => {
            mockRequest.user.roles = ["some_role"];
            const dbError = new Error("DB query failed");
            roleFindAllSpy.mockRejectedValue(dbError);

            await checkPermissionHandler(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Internal Server Error while checking permissions.",
            });
            expect(mockRequest.log.error).toHaveBeenCalledWith(
                { err: dbError },
                "RBAC: Database error during permission check (Role.findAll)."
            );
        });
    });

    describe("checkRole Handler", () => {
        it("should return 401 if no user on request", async () => {
            mockRequest.user = null;
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(401);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Unauthorized. Authentication required.",
            });
        });

        it("should return 403 if user.roles is missing in JWT", async () => {
            mockRequest.user = { id: 1 };
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Forbidden. User roles not available in token.",
            });
            expect(mockRequest.log.warn).toHaveBeenCalledWith(
                "RBAC: Roles not found or not an array in JWT payload for user ID 1."
            );
        });

        it("should return 403 if user.roles is not an array in JWT", async () => {
            mockRequest.user = { id: 1, roles: "not_an_array" };
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Forbidden. User roles not available in token.",
            });
        });

        it("should return 403 if user does not have the required role in JWT roles array", async () => {
            mockRequest.user.roles = ["another_role"];
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: "Forbidden. Required role: 'test_role'.",
            });
            expect(mockRequest.log.info).toHaveBeenCalledWith(
                "RBAC: User 1 denied access to resource requiring role 'test_role'. User roles: another_role"
            );
        });

        it("should proceed if user has the required role in JWT roles array", async () => {
            mockRequest.user.roles = ["test_role", "another_role"];
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).not.toHaveBeenCalled();
            expect(mockReply.send).not.toHaveBeenCalled();
        });
    });
});
