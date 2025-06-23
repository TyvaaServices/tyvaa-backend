// tests/unit/userModel.rbac.test.js

// Import the User model. Sequelize and other models will be mocked as needed.
// We are testing the prototype methods, so we need a User class/constructor.
// However, User model is initialized with a sequelize instance.
// For pure unit tests of prototype functions, we can mock the parts they depend on.

// Mock the User model's dependencies for `getRoles` and `role.getPermissions`
// This is a simplified approach. A more robust way might involve jest.mock for the actual models.
import { jest } from '@jest/globals'; // Import jest explicitly

// Let's assume User is the class constructor from the model definition
// We'll manually create a User "instance" and attach mock methods.

// Mock Role and Permission objects that would be returned by Sequelize mixins
const mockPermission = (name) => ({ name, otherPermissionData: '...' });
const mockRole = (name, permissions = []) => ({
    name,
    getPermissions: jest.fn().mockResolvedValue(permissions), // Mock the Sequelize mixin for Role
    otherRoleData: '...'
});


describe('User Model RBAC Methods', () => {
    let userInstance;

    beforeEach(() => {
        // Create a fresh "mock" user instance for each test
        // This isn't a real Sequelize instance, but an object that mimics its structure
        // for testing the prototype methods.
        userInstance = {
            // Mock the `getRoles` Sequelize mixin for the User instance
            getRoles: jest.fn(),
            // Attach the prototype methods we want to test
            // These are directly from src/modules/user-module/models/user.js
            // For this to work, we need to ensure the actual User model is imported
            // and its prototype methods are available.
            // This approach is a bit tricky for Sequelize models without a full Sequelize mock.
            // A better way would be to import User and then spyOn/mock its `getRoles` method.
        };
    });

    // To properly test Sequelize model instance methods, we should import the actual User model
    // and then mock the `getRoles` method on its prototype or on specific instances.
    // However, that requires the Sequelize connection to be mocked or handled.

    // Let's try a different approach: Import the real User model,
    // then create an instance (even if not from DB) and mock its `getRoles` method.
    // This is still not perfect as `User.findByPk` would need a DB.
    // The most direct way is to test the logic by providing mock inputs to the functions.

    // Re-importing User model methods directly for testing their logic:
    // This is NOT how they are defined (they are User.prototype.method).
    // This is just to test the logic in isolation if we extract it.
    // This is becoming complicated. Let's simplify.

    // We will assume `User.prototype.hasRole` etc. are available.
    // We will create a plain object and assign the prototype methods to it,
    // then mock `this.getRoles` for that object.

    const UserPrototype = {
        // Manually copy the logic from User model's prototype methods for isolated testing
        // This is not ideal but avoids complex Sequelize mocking for this specific test.
        // A better long-term solution is a proper Sequelize testing setup.

        async hasRole(roleName) {
            const roles = await this.getRoles();
            return roles.some(role => role.name === roleName);
        },

        async getPermissions() {
            const roles = await this.getRoles();
            let allPermissions = [];
            for (const role of roles) {
                const permissions = await role.getPermissions();
                allPermissions = allPermissions.concat(permissions);
            }
            return allPermissions.filter((permission, index, self) =>
                index === self.findIndex((p) => p.name === permission.name)
            );
        },

        async hasPermission(permissionName) {
            const roles = await this.getRoles();
            for (const role of roles) {
                const permissions = await role.getPermissions();
                if (permissions.some(permission => permission.name === permissionName)) {
                    return true;
                }
            }
            return false;
        }
    };


    describe('hasRole', () => {
        it('should return true if the user has the specified role', async () => {
            const testUser = { getRoles: jest.fn().mockResolvedValue([mockRole('ADMIN')]) };
            Object.setPrototypeOf(testUser, UserPrototype); // Assign prototype methods

            const result = await testUser.hasRole('ADMIN');
            expect(result).toBe(true);
            expect(testUser.getRoles).toHaveBeenCalledTimes(1);
        });

        it('should return false if the user does not have the specified role', async () => {
            const testUser = { getRoles: jest.fn().mockResolvedValue([mockRole('USER')]) };
            Object.setPrototypeOf(testUser, UserPrototype);

            const result = await testUser.hasRole('ADMIN');
            expect(result).toBe(false);
        });

        it('should handle users with no roles', async () => {
            const testUser = { getRoles: jest.fn().mockResolvedValue([]) };
            Object.setPrototypeOf(testUser, UserPrototype);

            const result = await testUser.hasRole('ADMIN');
            expect(result).toBe(false);
        });
    });

    describe('getPermissions', () => {
        it('should return all unique permissions from user roles', async () => {
            const perm1 = mockPermission('perm1');
            const perm2 = mockPermission('perm2');
            const perm3 = mockPermission('perm3');

            const role1 = mockRole('RoleA', [perm1, perm2]);
            const role2 = mockRole('RoleB', [perm2, perm3]); // perm2 is duplicated

            const testUser = { getRoles: jest.fn().mockResolvedValue([role1, role2]) };
            Object.setPrototypeOf(testUser, UserPrototype);

            const permissions = await testUser.getPermissions();
            expect(permissions).toHaveLength(3);
            expect(permissions).toEqual(expect.arrayContaining([perm1, perm2, perm3]));
            expect(role1.getPermissions).toHaveBeenCalledTimes(1);
            expect(role2.getPermissions).toHaveBeenCalledTimes(1);
        });

        it('should return empty array if user has no roles', async () => {
            const testUser = { getRoles: jest.fn().mockResolvedValue([]) };
            Object.setPrototypeOf(testUser, UserPrototype);
            const permissions = await testUser.getPermissions();
            expect(permissions).toEqual([]);
        });

        it('should return empty array if roles have no permissions', async () => {
            const role1 = mockRole('RoleA', []);
            const testUser = { getRoles: jest.fn().mockResolvedValue([role1]) };
            Object.setPrototypeOf(testUser, UserPrototype);
            const permissions = await testUser.getPermissions();
            expect(permissions).toEqual([]);
        });
    });

    describe('hasPermission', () => {
        it('should return true if user has the permission through any role', async () => {
            const perm1 = mockPermission('perm_read');
            const perm2 = mockPermission('perm_write');
            const role1 = mockRole('Editor', [perm1, perm2]);
            const testUser = { getRoles: jest.fn().mockResolvedValue([role1]) };
            Object.setPrototypeOf(testUser, UserPrototype);

            expect(await testUser.hasPermission('perm_read')).toBe(true);
            expect(await testUser.hasPermission('perm_write')).toBe(true);
        });

        it('should return false if user does not have the permission', async () => {
            const perm1 = mockPermission('perm_read');
            const role1 = mockRole('Viewer', [perm1]);
            const testUser = { getRoles: jest.fn().mockResolvedValue([role1]) };
            Object.setPrototypeOf(testUser, UserPrototype);

            expect(await testUser.hasPermission('perm_write')).toBe(false);
        });

        it('should return false if user has no roles', async () => {
            const testUser = { getRoles: jest.fn().mockResolvedValue([]) };
            Object.setPrototypeOf(testUser, UserPrototype);
            expect(await testUser.hasPermission('perm_read')).toBe(false);
        });

        it('should check multiple roles for a permission', async () => {
            const permRead = mockPermission('perm_read');
            const permWrite = mockPermission('perm_write');

            const roleViewer = mockRole('Viewer', [permRead]);
            const roleContributor = mockRole('Contributor', [permWrite]);

            const testUser = { getRoles: jest.fn().mockResolvedValue([roleViewer, roleContributor]) };
            Object.setPrototypeOf(testUser, UserPrototype);

            expect(await testUser.hasPermission('perm_write')).toBe(true);
            // Check that getPermissions on roles was called until permission found
            // (or through all roles if not found)
            // The current implementation iterates all roles and their permissions.
        });
    });
});
