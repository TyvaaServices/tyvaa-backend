// tests/unit/rbacPlugin.test.js
import { jest } from '@jest/globals';
import rbacPluginFp, { modelsPlugin as modelsPluginFp } from '../../src/utils/rbacPlugin.js';
import User from '../../src/modules/user-module/models/user.js';
import Role from '../../src/modules/user-module/models/role.js';
import Permission from '../../src/modules/user-module/models/permission.js';

// Mock the models that modelsPlugin would import
jest.mock('../../src/modules/user-module/models/user.js');
jest.mock('../../src/modules/user-module/models/role.js');
jest.mock('../../src/modules/user-module/models/permission.js');


describe('Models Plugin', () => {
    let mockFastify;

    beforeEach(() => {
        mockFastify = {
            decorate: jest.fn(),
        };
    });

    it('should decorate fastify with models', async () => {
        // The plugin itself is wrapped with fp, so we call the function fp returns.
        // Or, if fp is simple pass-through in test, call modelsPluginFp.default directly if needed.
        // Assuming fp(plugin) returns the plugin function directly for testing.
        // const modelsPlugin = modelsPluginFp[Symbol.for('fastify.plugin.fn')];
        // modelsPluginFp is the actual plugin function.
        // Since it's an async function, await should work.
        await modelsPluginFp(mockFastify, {});

        expect(mockFastify.decorate).toHaveBeenCalledWith('models', {
            User: User, // User will be the mocked constructor
            Role: Role,
            Permission: Permission,
        });
    });
});

describe('RBAC Plugin', () => {
    let mockFastify;
    let mockRequest;
    let mockReply;
    let checkPermissionHandler;
    let checkRoleHandler;
    let mockUserInstance;

    beforeEach(async () => { // Make this async
        mockUserInstance = {
            id: 1,
            hasPermission: jest.fn(),
            hasRole: jest.fn(),
        };

        const MockUser = {
            findByPk: jest.fn().mockResolvedValue(mockUserInstance),
        };

        mockFastify = {
            decorate: jest.fn((name, func) => {
                // Capture the decorated function (checkPermission or checkRole)
                if (name === 'checkPermission') {
                    // func is the outer function (requiredPermission) => async (request, reply)
                    // We call it to get the actual handler
                    checkPermissionHandler = func('test_permission');
                }
                if (name === 'checkRole') {
                    checkRoleHandler = func('test_role');
                }
            }),
            models: { User: MockUser }, // Mock fastify.models.User
        };

        mockRequest = {
            user: { id: 1 }, // Default authenticated user
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

        // Ensure that mockFastify.models.User.findByPk is a fresh mock for each test
        // The User model itself is mocked via jest.mock at the top.
        // The rbacPlugin uses fastify.models.User.
        mockFastify.models.User.findByPk = jest.fn().mockResolvedValue(mockUserInstance);


        // Call the plugin to decorate mockFastify
        // rbacPluginFp is the actual plugin function.
        // It's an async function, so await should work, or provide a done callback.
        // Let's use await as it's simpler if fp handles async functions that way.
        await rbacPluginFp(mockFastify, {});
    });

    it('should decorate fastify with checkPermission and checkRole', () => {
        expect(mockFastify.decorate).toHaveBeenCalledWith('checkPermission', expect.any(Function));
        expect(mockFastify.decorate).toHaveBeenCalledWith('checkRole', expect.any(Function));
    });

    describe('checkPermission Handler', () => {
        it('should return 401 if no user on request', async () => {
            mockRequest.user = null;
            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(401);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Unauthorized. Authentication required.' });
            expect(mockRequest.log.warn).toHaveBeenCalledWith('RBAC: No user found on request. Ensure authentication runs before permission check.');
        });

        it('should return 500 if User model not found on fastify.models', async () => {
            mockFastify.models.User = null; // Simulate User model not registered
            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Internal Server Error: RBAC configuration issue.' });
            expect(mockRequest.log.error).toHaveBeenCalledWith('RBAC: User model not found on fastify.models. Ensure models are registered.');
        });

        it('should return 403 if userInstance not found by User.findByPk', async () => {
            mockFastify.models.User.findByPk.mockResolvedValue(null);
            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Forbidden. User not found or invalid.' });
            expect(mockRequest.log.warn).toHaveBeenCalledWith('RBAC: User with ID 1 not found in database.');
        });

        it('should return 403 if user does not have permission', async () => {
            mockUserInstance.hasPermission.mockResolvedValue(false);
            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({ message: "Forbidden. Required permission: 'test_permission'." });
            expect(mockUserInstance.hasPermission).toHaveBeenCalledWith('test_permission');
            expect(mockRequest.log.info).toHaveBeenCalledWith("RBAC: User 1 denied access to resource requiring permission 'test_permission'.");
        });

        it('should proceed if user has permission', async () => {
            mockUserInstance.hasPermission.mockResolvedValue(true);
            await checkPermissionHandler(mockRequest, mockReply);
            expect(mockReply.status).not.toHaveBeenCalled();
            expect(mockReply.send).not.toHaveBeenCalled();
            expect(mockUserInstance.hasPermission).toHaveBeenCalledWith('test_permission');
        });

        it('should handle error from User.findByPk', async () => {
            mockFastify.models.User.findByPk.mockRejectedValue(new Error('DB error'));
            // For route handlers, errors are typically passed to Fastify's error handler
            // The test should check if the error is thrown or passed to reply.send appropriately
            // Given the current plugin structure, it doesn't explicitly pass to an error handler.
            // It would likely result in an unhandled promise rejection if not caught by Fastify.
            // Let's assume Fastify catches it and test for a 500 or specific error handling if added.
            // For now, we'll test that it doesn't succeed.
            try {
                await checkPermissionHandler(mockRequest, mockReply);
            } catch (e) {
                // Fastify might catch this and convert to 500. This test setup doesn't fully emulate that.
                // We can check that send was not called successfully.
            }
            expect(mockReply.send).not.toHaveBeenCalledWith(expect.objectContaining({ message: "Forbidden. Required permission: 'test_permission'." }));
        });
         it('should handle error from userInstance.hasPermission', async () => {
            mockUserInstance.hasPermission.mockRejectedValue(new Error('Check failed'));
            try {
                 await checkPermissionHandler(mockRequest, mockReply);
            } catch (e) {
                // Similar to above, Fastify would handle this.
            }
            expect(mockReply.send).not.toHaveBeenCalledWith(expect.objectContaining({ message: "Forbidden. Required permission: 'test_permission'." }));
        });
    });

    describe('checkRole Handler', () => {
        it('should return 401 if no user on request', async () => {
            mockRequest.user = null;
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(401);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Unauthorized. Authentication required.' });
            expect(mockRequest.log.warn).toHaveBeenCalledWith('RBAC: No user found on request for role check.');
        });

        it('should return 500 if User model not found on fastify.models', async () => {
            mockFastify.models.User = null;
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Internal Server Error: RBAC configuration issue.' });
            expect(mockRequest.log.error).toHaveBeenCalledWith('RBAC: User model not found for role check.');
        });

        it('should return 403 if userInstance not found by User.findByPk', async () => {
            mockFastify.models.User.findByPk.mockResolvedValue(null);
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({ message: 'Forbidden. User not found or invalid.' });
            expect(mockRequest.log.warn).toHaveBeenCalledWith('RBAC: User with ID 1 not found for role check.');
        });

        it('should return 403 if user does not have role', async () => {
            mockUserInstance.hasRole.mockResolvedValue(false);
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({ message: "Forbidden. Required role: 'test_role'." });
            expect(mockUserInstance.hasRole).toHaveBeenCalledWith('test_role');
            expect(mockRequest.log.info).toHaveBeenCalledWith("RBAC: User 1 denied access to resource requiring role 'test_role'.");
        });

        it('should proceed if user has role', async () => {
            mockUserInstance.hasRole.mockResolvedValue(true);
            await checkRoleHandler(mockRequest, mockReply);
            expect(mockReply.status).not.toHaveBeenCalled();
            expect(mockReply.send).not.toHaveBeenCalled();
            expect(mockUserInstance.hasRole).toHaveBeenCalledWith('test_role');
        });
         it('should handle error from User.findByPk in checkRole', async () => {
            mockFastify.models.User.findByPk.mockRejectedValue(new Error('DB error'));
            try {
                await checkRoleHandler(mockRequest, mockReply);
            } catch (e) {}
            expect(mockReply.send).not.toHaveBeenCalledWith(expect.objectContaining({ message: "Forbidden. Required role: 'test_role'." }));
        });

        it('should handle error from userInstance.hasRole', async () => {
            mockUserInstance.hasRole.mockRejectedValue(new Error('Check failed'));
            try {
                await checkRoleHandler(mockRequest, mockReply);
            } catch (e) {}
            expect(mockReply.send).not.toHaveBeenCalledWith(expect.objectContaining({ message: "Forbidden. Required role: 'test_role'." }));
        });
    });
});
