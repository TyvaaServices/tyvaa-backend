// tests/unit/rbacSeeder.test.js
import { jest } from '@jest/globals';
import { seedDatabase } from '../../src/seeders/rbacSeeder.js';
import User from '../../src/modules/user-module/models/user.js';
import Role from '../../src/modules/user-module/models/role.js';
import Permission from '../../src/modules/user-module/models/permission.js';
import sequelize from '../../src/config/db.js';

jest.mock('../../src/modules/user-module/models/user.js');
jest.mock('../../src/modules/user-module/models/role.js');
jest.mock('../../src/modules/user-module/models/permission.js');
jest.mock('../../src/config/db.js', () => ({
    sync: jest.fn().mockResolvedValue(undefined), // Mock sequelize.sync
    close: jest.fn().mockResolvedValue(undefined) // Mock sequelize.close if used
}));

// Mock process.exit globally for tests that might trigger it on module load
const mockExit = jest.fn();
process.exit = mockExit;

// Mock console logs to prevent them from cluttering test output
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

    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks before each test

        // Setup default mock implementations
        Permission.findOrCreate = jest.fn((options) => {
            const permission = { id: Math.random(), name: options.where.name, ...options.defaults };
            mockPermissions[options.where.name] = permission;
            return Promise.resolve([permission, true]); // Simulate creation
        });

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
        User.findOne = jest.fn().mockResolvedValue(null); // Default to admin not found
        User.create = jest.fn().mockResolvedValue(mockAdminUser);


        mockAdminRole = { id: 5, name: 'ADMINISTRATEUR', addPermissions: jest.fn().mockResolvedValue(undefined) };
        mockPermissions = {};
        mockRoles = { 'ADMINISTRATEUR': mockAdminRole }; // Ensure ADMINSTRATEUR role is available

        // Make Role.findOrCreate return the specific admin role when called for ADMINISTRATEUR
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

        // Check role-permission assignment
        // Example: Check for UTILISATEUR_BASE
        const utilisateurBaseRole = mockRoles['UTILISATEUR_BASE'];
        expect(utilisateurBaseRole.addPermissions).toHaveBeenCalled();
        // You could add more specific checks for the arguments of addPermissions if needed

        // Check for ADMINISTRATEUR
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
        // ADMIN_PASSWORD is not set by default in this test

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
        // If User.create fails, the current seeder code logs the specific error and continues.
        // It does not re-throw, so the main catch block of seedDatabase might not be hit by this specific error.
        // Thus, we only check for the specific log here.
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
    // const originalArgv = process.argv; // Keep only one declaration
    // const originalExit = process.exit; // mockExit is now global
    // const originalMetaUrl = import.meta.url; // Logic for this is changed

    const originalProcessArgv = [...process.argv];

    beforeEach(() => { // No longer async
        jest.resetModules();
        mockExit.mockClear();
        global.console.log.mockClear();
        global.console.error.mockClear();
        process.argv = [...originalProcessArgv]; // Ensure argv is reset before each test
         // import.meta.url will be manipulated by runScriptDirectly per test
    });

    afterEach(() => {
        process.argv = [...originalProcessArgv]; // Restore original argv
        // No need to restore import.meta.url here as it's managed by jest.unstable_mockModule per import
    });

    // Helper function to simulate running the script directly
    async function runScriptDirectlyAndSpy(seedDatabaseMockImplementation) {
        const scriptPath = `${process.cwd()}/src/seeders/rbacSeeder.js`;
        process.argv = ['node', scriptPath];
        // Jest's mocking of import.meta.url is tricky. We rely on process.argv for the condition.
        // The actual import.meta.url will be that of the test file.
        // The seeder's check `import.meta.url === file://${process.argv[1]}` will be false.
        // To make it true, we'd need to mock import.meta.url for the seeder module itself.

        // Instead, let's ensure the condition `import.meta.url === \`file://\${process.argv[1]}\`` is met
        // by temporarily overriding import.meta.url in the test context for the dynamic import.
        // This is highly experimental and might not work as expected due to ESM spec.
        // A better way would be to refactor seeder to be testable e.g. export the autorun logic.

        // Given the difficulty, we'll assume process.argv[1] matching is the dominant factor
        // for the seeder's current logic if import.meta.url is not easily mockable for a specific module.
        // Or, the seeder could be refactored to export its main function and autorun check separately.

        // For now, we will spy on the seedDatabase function after import.
        const rbacSeederModule = await import('../../src/seeders/rbacSeeder.js');
        const seedDatabaseSpy = jest.spyOn(rbacSeederModule, 'seedDatabase');
        if (seedDatabaseMockImplementation) {
            seedDatabaseSpy.mockImplementation(seedDatabaseMockImplementation);
        }

        // Re-trigger the module's top-level execution by re-importing or re-evaluating.
        // jest.resetModules() + import() is the standard way.
        // The autorun block in rbacSeeder.js runs when the module is first evaluated.
        // So, the spy needs to be set up BEFORE the import that triggers the autorun.

        // Corrected approach: Reset modules, set up spy, then import.
        jest.resetModules(); // This is crucial.
        const tempRbacSeederModule = await import('../../src/seeders/rbacSeeder.js'); // This import will run the script logic
        const actualSeedDatabaseSpy = jest.spyOn(tempRbacSeederModule, 'seedDatabase'); // Spy on the actual function

        if (seedDatabaseMockImplementation) {
            actualSeedDatabaseSpy.mockImplementation(seedDatabaseMockImplementation);
             // If we mock the implementation, we need to ensure the script is re-run
             // with this mock. This is tricky.
             // The initial import already ran seedDatabase.
        }
        // The most reliable way is to let the original seedDatabase run (which uses model mocks)
        // and check side effects (process.exit, console logs from autorun block).

        // Let's simplify: the dynamic import inside the test case will trigger the autorun.
        // We will check process.exit and the initial console log.
        // The detailed behavior of seedDatabase is tested elsewhere.

        // The `runScriptDirectly` helper will now just set up argv and import.
        // The spy/mock for seedDatabase will be done in the test itself if needed.
        // For these tests, we'll let the original seedDatabase (which uses Model mocks) run.
    }


    it('should call seedDatabase, log, and exit with 0 if script is run directly and succeeds', async () => {
        process.argv = ['node', `${process.cwd()}/src/seeders/rbacSeeder.js`];
        // Ensure seedDatabase (via its mocks) simulates success
        Permission.findOrCreate.mockResolvedValue([{ id: 1, name: 'p1' }, true]); // Default success
        Role.findOrCreate.mockResolvedValue([{ id: 1, name: 'Role1', addPermissions: jest.fn() }, true]);
        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ setRoles: jest.fn().mockResolvedValue(true) });
        process.env.ADMIN_PASSWORD = 'foo';


        const seederModule = await import('../../src/seeders/rbacSeeder.js');
        // Wait for promises in the autorun block to settle
        // await new Promise(resolve => process.nextTick(resolve));
        // await new Promise(resolve => process.nextTick(resolve)); // Maybe a couple of ticks
        await new Promise(resolve => setTimeout(resolve, 0)); // Try with setTimeout

        expect(console.log).toHaveBeenCalledWith('Running RBAC Seeder...');
        // We won't check internal logs of seedDatabase here, those are for its own unit tests.
        expect(console.log).toHaveBeenCalledWith('Seeder finished. Exiting.');
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should call seedDatabase, log error from autorun, and exit with 1 if seedDatabase promise rejects', async () => {
        process.argv = ['node', `${process.cwd()}/src/seeders/rbacSeeder.js`];

        // To make seedDatabase itself reject, we need to mock it.
        // This is the tricky part. We need to mock it BEFORE the module containing the autorun is imported.
        jest.resetModules();
        jest.doMock('../../src/seeders/rbacSeeder.js', () => {
            const originalModule = jest.requireActual('../../src/seeders/rbacSeeder.js');
            return {
                ...originalModule,
                seedDatabase: jest.fn().mockRejectedValue(new Error("Forced Seeder Failure")),
            };
        });

        const seederModule = await import('../../src/seeders/rbacSeeder.js');
        // Wait for promises in the autorun block to settle
        await new Promise(resolve => setTimeout(resolve, 0)); // Extra wait
        // await new Promise(resolve => process.nextTick(resolve));
        // await new Promise(resolve => process.nextTick(resolve));


        expect(console.log).toHaveBeenCalledWith('Running RBAC Seeder...');
        expect(console.error).toHaveBeenCalledWith('Seeder failed:', expect.objectContaining({ message: "Forced Seeder Failure" }));
        expect(mockExit).toHaveBeenCalledWith(1);
    });

});
