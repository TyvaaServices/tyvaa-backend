import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/modules/user-module/models/user.js', () => ({
    __esModule: true,
    default: {},
}));
jest.unstable_mockModule('../../src/modules/user-module/models/role.js', () => ({
    __esModule: true,
    default: {},
}));
jest.unstable_mockModule('../../src/modules/user-module/models/permission.js', () => ({
    __esModule: true,
    default: {},
}));
jest.unstable_mockModule('../../src/config/db.js', () => ({
    __esModule: true,
    default: {
        sync: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
    },
}));

// Now import after all mocks are set up
let seedDatabase;
beforeAll(async () => {
    seedDatabase = (await import('../../src/seeders/rbacSeeder.js')).seedDatabase;
});

// Mock process.exit globally for tests that might trigger it on module load
const mockExit = jest.fn();
process.exit = mockExit;

global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

describe('RBAC Seeder - seedDatabase', () => {
    let mockAdminUser;
    let mockAdminRole;
    let mockPermissions;
    let mockRoles;
    let Permission;
    let Role;
    let User;

    beforeEach(async () => {
        jest.clearAllMocks(); // Clear all mocks before each test

        Permission = (await import('../../src/modules/user-module/models/permission.js')).default;
        Permission.findOrCreate = jest.fn((options) => {
            const permission = {id: Math.random(), name: options.where.name, ...options.defaults};
            mockPermissions[options.where.name] = permission;
            return Promise.resolve([permission, true]); // Simulate creation
        });

        Role = (await import('../../src/modules/user-module/models/role.js')).default;
        Role.findOrCreate = jest.fn((options) => {
            const role = {
                id: Math.random(),
                name: options.where.name,
                addPermissions: jest.fn().mockResolvedValue(undefined),
            };
            mockRoles[options.where.name] = role;
            return Promise.resolve([role, true]); // Simulate creation
        });

        mockAdminUser = {
            id: 1,
            email: 'admin@example.com',
            phoneNumber: '+10000000000',
            setRoles: jest.fn().mockResolvedValue(undefined),
        };
        User = (await import('../../src/modules/user-module/models/user.js')).default;
        User.findOne = jest.fn().mockResolvedValue(null); // Default to admin not found
        User.create = jest.fn().mockResolvedValue(mockAdminUser);


        mockAdminRole = {id: 5, name: 'ADMINISTRATEUR', addPermissions: jest.fn().mockResolvedValue(undefined)};
        mockPermissions = {};
        mockRoles = {'ADMINISTRATEUR': mockAdminRole}; // Ensure ADMINSTRATEUR role is available

        Role.findOrCreate.mockImplementation((options) => {
            const role = {
                id: Math.random(),
                name: options.where.name,
                addPermissions: jest.fn().mockResolvedValue(undefined),
            };
            if (options.where.name === 'ADMINISTRATEUR') {
                mockRoles[options.where.name] = mockAdminRole;
                return Promise.resolve([mockAdminRole, true]);
            }
            mockRoles[options.where.name] = role;
            return Promise.resolve([role, true]);
        });

        process.env.ADMIN_EMAIL = 'admin@example.com';
        process.env.ADMIN_PHONE = '+10000000000';
    });

    afterEach(() => {
        delete process.env.ADMIN_PASSWORD;
        delete process.env.ADMIN_EMAIL;
        delete process.env.ADMIN_PHONE;
    });

    it('should create permissions and roles, and assign them correctly', async () => {
        await seedDatabase();

        // Check permissions creation
        expect(Permission.findOrCreate).toHaveBeenCalledTimes(18); // 18 permissions in data
        // Check roles creation
        expect(Role.findOrCreate).toHaveBeenCalledTimes(5); // 5 roles in data
        const utilisateurBaseRole = mockRoles['UTILISATEUR_BASE'];
        expect(utilisateurBaseRole.addPermissions).toHaveBeenCalled();
        expect(mockAdminRole.addPermissions).toHaveBeenCalled();
    });

    it('should assign admin role to existing admin user (found by email)', async () => {
        User.findOne.mockResolvedValueOnce(mockAdminUser); // Admin user exists
        process.env.ADMIN_PASSWORD = 'password123'; // Should not be needed if user exists

        await seedDatabase();

        expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
        expect(User.create).not.toHaveBeenCalled();
        expect(mockAdminUser.setRoles).toHaveBeenCalledWith([mockAdminRole]);
        expect(console.log).toHaveBeenCalledWith('Assigned ADMINISTRATEUR role to user admin@example.com.');
    });

    it('should assign admin role to existing admin user (found by phone)', async () => {
        User.findOne.mockResolvedValueOnce(null); // Not found by email
        User.findOne.mockResolvedValueOnce(mockAdminUser); // Found by phone
        process.env.ADMIN_PASSWORD = 'password123';

        await seedDatabase();
        expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
        expect(User.findOne).toHaveBeenCalledWith({ where: { phoneNumber: '+10000000000' } });
        expect(User.create).not.toHaveBeenCalled();
        expect(mockAdminUser.setRoles).toHaveBeenCalledWith([mockAdminRole]);
        expect(console.log).toHaveBeenCalledWith('Assigned ADMINISTRATEUR role to user admin@example.com.');
    });


    it('should create admin user and assign role if user does not exist and ADMIN_PASSWORD is set', async () => {
        User.findOne.mockResolvedValue(null); // Admin user does not exist
        process.env.ADMIN_PASSWORD = 'password123';

        await seedDatabase();

        expect(User.create).toHaveBeenCalledWith({
            phoneNumber: '+10000000000',
            fullName: 'Default Admin',
            email: 'admin@example.com',
            sexe: 'male',
            dateOfBirth: '1990-01-01',
            isActive: true,
        });
        expect(mockAdminUser.setRoles).toHaveBeenCalledWith([mockAdminRole]);
        expect(console.log).toHaveBeenCalledWith('Admin user created with phone +10000000000. Please set password securely if not handled by model.');
        expect(console.log).toHaveBeenCalledWith('Assigned ADMINISTRATEUR role to user admin@example.com.');
    });

    it('should skip admin assignment if user does not exist and ADMIN_PASSWORD is not set', async () => {
        User.findOne.mockResolvedValue(null); // Admin user does not exist

        await seedDatabase();

        expect(User.create).not.toHaveBeenCalled();
        expect(mockAdminUser.setRoles).not.toHaveBeenCalled(); // setRoles is on the instance
        expect(console.log).toHaveBeenCalledWith('Admin user not found and ADMIN_PASSWORD not set in .env, skipping admin role assignment.');
    });

    it('should handle error during permission creation', async () => {
        Permission.findOrCreate.mockRejectedValueOnce(new Error('Permission DB Error'));
        await seedDatabase();
        expect(console.error).toHaveBeenCalledWith('Error seeding database for RBAC:', expect.any(Error));
    });

    it('should handle error during role creation', async () => {
        Role.findOrCreate.mockRejectedValueOnce(new Error('Role DB Error'));
        await seedDatabase();
        expect(console.error).toHaveBeenCalledWith('Error seeding database for RBAC:', expect.any(Error));
    });

    it('should handle error during role.addPermissions', async () => {
        const mockRoleWithError = {
            id: 99,
            name: 'ERROR_ROLE',
            addPermissions: jest.fn().mockRejectedValue(new Error('AddPermissions Error')),
        };
        Role.findOrCreate.mockImplementation((options) => {
             if (options.where.name === 'UTILISATEUR_BASE') { // Trigger error for a specific role
                return Promise.resolve([mockRoleWithError, true]);
            }
            const role = { id: Math.random(), name: options.where.name, addPermissions: jest.fn().mockResolvedValue(undefined) };
            mockRoles[options.where.name] = role;
            return Promise.resolve([role, true]);
        });

        await seedDatabase();
        expect(console.error).toHaveBeenCalledWith('Error seeding database for RBAC:', expect.any(Error));
    });


    it('should handle error during User.create for admin', async () => {
        User.findOne.mockResolvedValue(null);
        process.env.ADMIN_PASSWORD = 'password123';
        User.create.mockRejectedValueOnce(new Error('User Create Error'));

        await seedDatabase();

        expect(console.error).toHaveBeenCalledWith('Failed to create admin user with phone +10000000000:', 'User Create Error');
  });

    it('should handle error during adminUser.setRoles', async () => {
        User.findOne.mockResolvedValue(mockAdminUser); // Admin user exists
        mockAdminUser.setRoles.mockRejectedValueOnce(new Error('SetRoles Error'));
        process.env.ADMIN_PASSWORD = 'password123';

        await seedDatabase();
        expect(console.error).toHaveBeenCalledWith('Error seeding database for RBAC:', expect.any(Error));
    });

    it('should call Permission.findOrCreate with correct defaults', async () => {
        await seedDatabase();
        expect(Permission.findOrCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { name: 'reserver_trajet' },
                defaults: { description: 'Autorise à rechercher et réserver un trajet' },
            })
        );
    });

    it('should attempt to find admin by email first, then phone', async () => {
        process.env.ADMIN_PASSWORD = 'password123';
        User.findOne.mockResolvedValueOnce(null); // Fail email lookup
        User.findOne.mockResolvedValueOnce(mockAdminUser); // Success phone lookup

        await seedDatabase();

        expect(User.findOne).toHaveBeenNthCalledWith(1, { where: { email: 'admin@example.com' } });
        expect(User.findOne).toHaveBeenNthCalledWith(2, { where: { phoneNumber: '+10000000000' } });
        expect(User.create).not.toHaveBeenCalled();
        expect(mockAdminUser.setRoles).toHaveBeenCalledWith([mockAdminRole]);
    });

    it('should correctly map permissions to roles', async () => {
        await seedDatabase();

        const passagerRole = mockRoles['PASSAGER'];
        const expectedPassagerPermissions = ['reserver_trajet', 'annuler_reservation']
            .map(name => mockPermissions[name])
            .filter(p => p); // filter out undefined if any permission wasn't "created" by the mock

        expect(passagerRole.addPermissions).toHaveBeenCalledWith(
            expect.arrayContaining(expectedPassagerPermissions)
        );
        expect(passagerRole.addPermissions.mock.calls[0][0].length).toBe(expectedPassagerPermissions.length);


        const adminRole = mockRoles['ADMINISTRATEUR'];
        const expectedAdminPermissionsCount = 18; // Admin gets all defined permissions
        expect(adminRole.addPermissions).toHaveBeenCalled();
        expect(adminRole.addPermissions.mock.calls[0][0].length).toBe(expectedAdminPermissionsCount);
    });

});

// Test the script execution part
describe('RBAC Seeder - Script Execution', () => {
    const originalArgv = process.argv.slice();
    const originalExit = process.exit;
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    let importMetaUrl;

    beforeEach(() => {
        jest.resetModules();
        mockExit.mockClear();
        global.console.log = jest.fn();
        global.console.error = jest.fn();
        // Simulate script execution context
        process.argv[1] = '/home/cheikh/WebstormProjects/backend-tyvaa/src/seeders/rbacSeeder.js';
        importMetaUrl = `file://${process.argv[1]}`;
        globalThis.importMeta = { url: importMetaUrl };
    });

    afterEach(() => {
        process.argv = originalArgv.slice();
        process.exit = originalExit;
        global.console.log = originalConsoleLog;
        global.console.error = originalConsoleError;
        delete globalThis.importMeta;
    });

    it('should call seedDatabase, log, and exit with 0 if script is run directly and succeeds', async () => {
        await import('../../src/seeders/rbacSeeder.js');
        // Wait for all promises to flush
        await new Promise(r => setTimeout(r, 10));
        expect(console.log).toHaveBeenCalledWith('Running RBAC Seeder...');
        expect(console.log).toHaveBeenCalledWith('Seeder finished. Exiting.');
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should call seedDatabase, log error from autorun, and exit with 1 if seedDatabase promise rejects', async () => {
        // Mock seedDatabase to throw
        jest.doMock('../../src/seeders/rbacSeeder.js', () => ({
            __esModule: true,
            seedDatabase: jest.fn().mockRejectedValue(new Error('Forced Seeder Failure')),
        }));
        jest.isolateModules(async () => {
            await import('../../src/seeders/rbacSeeder.js');
            await new Promise(r => setTimeout(r, 10));
            expect(console.log).toHaveBeenCalledWith('Running RBAC Seeder...');
            expect(console.error).toHaveBeenCalledWith('Seeder failed:', expect.objectContaining({ message: 'Forced Seeder Failure' }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });
});
