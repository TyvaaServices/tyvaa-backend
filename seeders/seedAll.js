import sequelize from "#config/db.js";
import Role from "../src/modules/user-module/models/role.js";

import {
    AuditAction,
    DriverApplication,
    DriverProfile,
    PassengerProfile,
    RideInstance,
    RideModel,
    User,
} from "#config/index.js";

async function seed() {
    await sequelize.sync({ force: true, logging: false });
    const { seedDatabase } = await import("./rbacSeeder.js");
    await seedDatabase();
    const roles = await Role.findAll();

    const users = await User.bulkCreate([
        {
            phoneNumber: "+12345678901",
            fullName: "Ouly Diallo",
            fcmToken: "token1",
            driverLicense: "DL12345",
            profileImage: "ouly.jpg",
            sexe: "female",
            dateOfBirth: new Date("2004-01-08"),
            email: "ouly@cheikh.com",
            isActive: true,
        },
        {
            phoneNumber: "+12345678902",
            fullName: "Cheikh Traore",
            fcmToken: "token2",
            driverLicense: "DL54321",
            profileImage: "cheikh.jpg",
            sexe: "male",
            dateOfBirth: new Date("2001-10-02"),
            email: "cheikh@ouly.com",
            isActive: true,
        },
        {
            email: "cheikh.traore@tyvaa.live",
            fullName: "Cheikh Traore",
            sexe: "male",
            dateOfBirth: "20001-10-02",
            isActive: true,
            phoneNumber: "+12345678903",
        },
        {
            email: "houleymatou.diallo@tyvaa.live",
            fullName: "Houleymatou Diallo",
            sexe: "female",
            dateOfBirth: "2005-01-08",
            isActive: true,
            phoneNumber: "+12345678904",
        },
    ]);

    
    const passagerRole = roles.find((r) => r.name === "PASSAGER");
    const chauffeurRole = roles.find((r) => r.name === "CHAUFFEUR");
    const superviseurRole = roles.find((r) => r.name === "SUPERVISEUR");
    const adminRole = roles.find((r) => r.name === "ADMINISTRATEUR");

    if (users[0] && passagerRole) await users[0].addRole(passagerRole);
    if (users[1] && chauffeurRole) await users[1].addRole(chauffeurRole);
    if (users[2] && superviseurRole) await users[2].addRole(superviseurRole);
    if (users[3] && adminRole) await users[3].addRole(adminRole);

    
    const usersWithRoles = await Promise.all(
        users.map(async (user) => {
            const userRoles = await user.getRoles();
            return { user, roles: userRoles.map((r) => r.name) };
        })
    );

    
    const passengerProfiles = await Promise.all(
        usersWithRoles.map(({ user, roles }) =>
            roles.includes("PASSAGER")
                ? PassengerProfile.create({ userId: user.id })
                : null
        )
    );
    const driverProfiles = await Promise.all(
        usersWithRoles.map(({ user, roles }) =>
            roles.includes("CHAUFFEUR")
                ? DriverProfile.create({
                      userId: user.id,
                      statusProfile: "Active",
                  })
                : null
        )
    );

    await AuditAction.bulkCreate([
        { actionType: "create", codeAction: "C" },
        { actionType: "update", codeAction: "U" },
        { actionType: "delete", codeAction: "D" },
        { actionType: "view", codeAction: "V" },
        { actionType: "exportsData", codeAction: "E" },
        { actionType: "login", codeAction: "L" },
        { actionType: "logout", codeAction: "O" },
    ]);

    
    const validDriverProfiles = driverProfiles.filter(Boolean);
    const validPassengerProfiles = passengerProfiles.filter(Boolean);

    
    const rideModels = await RideModel.bulkCreate(
        [
            {
                driverId: validDriverProfiles[0]?.id,
                departure: "City A",
                destination: "City B",
                seatsAvailable: 3,
                recurrence: ["Monday", "Wednesday"],
                comment: "Morning ride",
                price: 20,
                status: "active",
                startDate: new Date("2025-06-20"),
                endDate: new Date("2025-07-20"),
            },
            {
                driverId: validDriverProfiles[1]?.id,
                departure: "City C",
                destination: "City D",
                seatsAvailable: 2,
                recurrence: ["Friday"],
                comment: "Evening ride",
                price: 15,
                status: "active",
                startDate: new Date("2025-06-22"),
                endDate: new Date("2025-07-22"),
            },
        ].filter((ride) => ride.driverId)
    );

    
    const rideInstances = await RideInstance.bulkCreate(
        [
            {
                rideId: rideModels[0]?.id,
                rideDate: new Date("2025-06-21T08:00:00Z"),
                seatsAvailable: 3,
                seatsBooked: 1,
                status: "scheduled",
            },
            {
                rideId: rideModels[1]?.id,
                rideDate: new Date("2025-06-23T18:00:00Z"),
                seatsAvailable: 2,
                seatsBooked: 0,
                status: "scheduled",
            },
        ].filter((instance) => instance.rideId)
    );

    
    
    
    
    
    
    
    
    
    

    
    
    
    
    
    
    
    

    

    
    await Promise.all(
        validPassengerProfiles.map((profile) =>
            DriverApplication.create({
                status: "pending",
                applicationDate: new Date(),
                documents: "license.pdf",
                comments: "Initial application",
                userId: profile.userId,
            })
        )
    );

    
    await AuditAction.bulkCreate([
        { actionType: "create", codeAction: "CREATE" },
        { actionType: "update", codeAction: "UPDATE" },
        { actionType: "delete", codeAction: "DELETE" },
        { actionType: "view", codeAction: "VIEW" },
        { actionType: "exportsData", codeAction: "EXPORTS_DATA" },
        { actionType: "login", codeAction: "LOGIN" },
        { actionType: "logout", codeAction: "LOGOUT" },
    ]);
}

seed()
    .then(() => {
        
        process.exit(0);
    })
    .catch((_error) => {
        
        process.exit(1);
    });
