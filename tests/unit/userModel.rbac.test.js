import {beforeEach, describe, expect, it, jest} from '@jest/globals'; // Import jest explicitly

const mockPermission = (name) => ({ name, otherPermissionData: '...' });
const mockRole = (name, permissions = []) => ({
    name,
    getPermissions: jest.fn().mockResolvedValue(permissions), // Mock the Sequelize mixin for Role
    otherRoleData: '...'
});


describe('User Model RBAC Methods', () => {
    let userInstance;

    beforeEach(() => {
       userInstance = {
            getRoles: jest.fn(),
       };
    });

    const UserPrototype = {
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
        });
    });
});
