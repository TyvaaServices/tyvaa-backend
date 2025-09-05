import sequelize from "#config/db.js";
import { seedLandmarks } from "./landmarksSeeder.js";
import Role from "../src/modules/user-module/models/role.js";
import dotenv from "dotenv";

dotenv.config();
import {
    AuditAction,
    DriverApplication,
    DriverProfile,
    PassengerProfile,
    RideInstance,
    RideModel,
    User,
    Booking,
} from "#config/index.js";

async function seed() {
    try {
        await sequelize.sync({ force: false, logging: false });
        // await seedLandmarks();
        const { seedDatabase } = await import("./rbacSeeder.js");
        await seedDatabase();
        const roles = await Role.findAll();
        // Skip if users already exist
        const userCountf = await User.count();
        if (userCountf > 0) {
            console.log(
                "Users already exist, skipping user/role/profile/booking seeding."
            );
            return;
        }

        let users = [];
        try {
            users = await User.bulkCreate([
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
                    dateOfBirth: "2001-10-02",
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
            console.log("Users created:", users.length);
        } catch (err) {
            console.error("Error creating users:", err);
        }
        // Check if users exist in DB
        const userCount = await User.count();
        const newUserCount = await User.count();
        console.log("User count in DB after bulkCreate:", newUserCount);
        const passagerRole = roles.find((r) => r.name === "PASSAGER");
        const chauffeurRole = roles.find((r) => r.name === "CHAUFFEUR");
        const superviseurRole = roles.find((r) => r.name === "SUPERVISEUR");
        const adminRole = roles.find((r) => r.name === "ADMINISTRATEUR");

        if (users[0] && passagerRole) await users[0].addRole(passagerRole);
        if (users[1] && chauffeurRole) await users[1].addRole(chauffeurRole);
        if (users[2] && superviseurRole)
            await users[2].addRole(superviseurRole);
        if (users[3] && adminRole) {
            // Check if user already has this role before assigning
            const hasRole = await users[3].hasRole(adminRole);
            if (!hasRole) {
                await users[3].addRole(adminRole);
            }
        }
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

        try {
            // Récupérer les vrais IDs des passengerProfiles et rideInstances
            const actualPassengerProfiles = validPassengerProfiles.filter(
                (p) => p && p.userId
            );
            const actualRideInstances = rideInstances.filter((r) => r && r.id);

            if (
                actualPassengerProfiles.length > 0 &&
                actualRideInstances.length > 0
            ) {
                const bookings = [];

                // Créer 10 bookings avec les vrais IDs
                for (let i = 0; i < 10; i++) {
                    const passengerProfile =
                        actualPassengerProfiles[
                            i % actualPassengerProfiles.length
                        ];
                    const rideInstance =
                        actualRideInstances[i % actualRideInstances.length];

                    bookings.push({
                        rideInstanceId: rideInstance.id,
                        userId: passengerProfile.userId,
                        seatsBooked: Math.floor(Math.random() * 3) + 1,
                        status: i >= 8 ? "cancelled" : "booked", // Les 2 derniers seront cancelled
                    });
                }

                await Booking.bulkCreate(bookings, { ignoreDuplicates: true });
                console.log(`${bookings.length} bookings created successfully`);
            } else {
                console.log(
                    "No passenger profiles or ride instances found, skipping bookings creation"
                );
            }
        } catch (error) {
            console.error("Error creating bookings:", error.message);
        }
    } catch (error) {
        console.error("Error during seeding:", error);
    }
}

// seed()
//     .then(() => {
//         process.exit(0);
//     })
//     .catch((_error) => {
//         process.exit(1);
//     });
export { seed };
