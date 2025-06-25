import sequelize from "#config/db.js";
import User from "../src/modules/user-module/models/user.js"; // Needed for context if we assign default roles
import Role from "../src/modules/user-module/models/role.js";
import Permission from "../src/modules/user-module/models/permission.js";

const permissionsData = [
    // User/Passenger specific
    {
        name: "reserver_trajet",
        description: "Autorise à rechercher et réserver un trajet",
    },
    {
        name: "annuler_reservation",
        description: "Autorise à annuler une réservation",
    },
    {
        name: "voir_reservation",
        description: "Autorise à consulter ses réservations",
    },
    {
        name: "modifier_profil",
        description: "Autorise à modifier ses informations personnelles",
    },
    {
        name: "soumettre_candidature",
        description: "Autorise à postuler pour devenir chauffeur",
    },
    {
        name: "envoyer_message",
        description: "Autorise à envoyer des messages (chat, support)",
    },

    // Driver specific
    {
        name: "publier_trajet",
        description: "Autorise à créer et publier un trajet",
    },
    {
        name: "terminer_trajet",
        description: "Autorise à marquer un trajet comme terminé",
    },
    {
        name: "gerer_mes_trajets",
        description:
            "Autorise un chauffeur à gérer ses propres trajets publiés",
    },

    // Supervisor specific
    {
        name: "valider_candidature",
        description:
            "Autorise à approuver ou rejeter les candidatures chauffeurs",
    },
    {
        name: "voir_candidatures",
        description:
            "Autorise à consulter la liste des candidatures chauffeurs",
    },
    {
        name: "acceder_journal_audit_superviseur",
        description:
            "Autorise à consulter une vue restreinte du journal d’audit",
    },

    // Admin specific
    {
        name: "gerer_utilisateurs",
        description:
            "Autorise à créer, modifier, supprimer des comptes utilisateurs",
    },
    {
        name: "attribuer_roles",
        description:
            "Autorise à assigner ou retirer des rôles aux utilisateurs",
    },
    {
        name: "gerer_roles",
        description: "Autorise à créer, modifier, supprimer des rôles",
    },
    {
        name: "gerer_permissions",
        description:
            "Autorise à créer, modifier, supprimer des permissions et les lier aux rôles",
    },
    {
        name: "acceder_journal_audit_admin",
        description: "Autorise à consulter l'intégralité du journal d’audit",
    },
    {
        name: "voir_statistiques_plateforme",
        description:
            "Autorise à voir les statistiques globales de la plateforme",
    },
];

const rolesData = [
    { name: "UTILISATEUR_BASE" }, // Default role for any new user
    { name: "PASSAGER" },
    { name: "CHAUFFEUR" },
    { name: "SUPERVISEUR" },
    { name: "ADMINISTRATEUR" },
];

const rolePermissionsData = {
    UTILISATEUR_BASE: [
        "modifier_profil",
        "voir_reservation",
        "soumettre_candidature",
        "envoyer_message",
    ],
    PASSAGER: ["reserver_trajet", "annuler_reservation"], // Will also have UTILISATEUR_BASE permissions if users can have multiple roles or by assignment
    CHAUFFEUR: ["publier_trajet", "terminer_trajet", "gerer_mes_trajets"], // Will also have UTILISATEUR_BASE permissions
    SUPERVISEUR: [
        "valider_candidature",
        "voir_candidatures",
        "acceder_journal_audit_superviseur",
    ],

    // Admin gets all permissions
    ADMINISTRATEUR: [
        "reserver_trajet",
        "annuler_reservation",
        "voir_reservation",
        "modifier_profil",
        "soumettre_candidature",
        "envoyer_message",
        "publier_trajet",
        "terminer_trajet",
        "gerer_mes_trajets",
        "valider_candidature",
        "voir_candidatures",
        "acceder_journal_audit_superviseur",
        "gerer_utilisateurs",
        "attribuer_roles",
        "gerer_roles",
        "gerer_permissions",
        "acceder_journal_audit_admin",
        "voir_statistiques_plateforme",
    ],
};

async function seedDatabase() {
    try {
        await sequelize.sync({ alter: true });
        const createdPermissions = {};
        for (const pData of permissionsData) {
            const [permission, created] = await Permission.findOrCreate({
                where: { name: pData.name },
                defaults: { description: pData.description },
            });
            createdPermissions[pData.name] = permission;
            if (created) {
                console.log(`Permission '${pData.name}' created.`);
            } else {
                console.log(`Permission '${pData.name}' already exists.`);
            }
        }

        const createdRoles = {};
        for (const rData of rolesData) {
            const [role, created] = await Role.findOrCreate({
                where: { name: rData.name },
            });
            createdRoles[rData.name] = role;
            if (created) {
                console.log(`Role '${rData.name}' created.`);
            } else {
                console.log(`Role '${rData.name}' already exists.`);
            }
        }

        for (const roleName in rolePermissionsData) {
            const role = createdRoles[roleName];
            const permissionsToAssign = rolePermissionsData[roleName];
            if (role && permissionsToAssign) {
                const permissionInstances = permissionsToAssign
                    .map((pName) => createdPermissions[pName])
                    .filter((p) => p);
                await role.addPermissions(permissionInstances); // `addPermissions` is a Sequelize mixin
                console.log(
                    `Assigned ${permissionsToAssign.length} permissions to role '${roleName}'.`
                );
            }
        }
        const adminEmail = process.env.ADMIN_EMAIL || "admin@tyvaa.live";
        const adminPhone = process.env.ADMIN_PHONE || "+10000000000";

        if (createdRoles.ADMINISTRATEUR) {
            let adminUser = await User.findOne({
                where: { email: adminEmail },
            });
            if (!adminUser) {
                adminUser = await User.findOne({
                    where: { phoneNumber: adminPhone },
                });
            }

            if (!adminUser && process.env.ADMIN_PASSWORD) {
                // Only create if password is provided
                console.log(
                    `Admin user not found, creating one... (Phone: ${adminPhone})`
                );
                try {
                    adminUser = await User.create({
                        phoneNumber: adminPhone,
                        fullName: "Default Admin",
                        email: adminEmail,
                        sexe: "male",
                        dateOfBirth: "1990-01-01",
                        isActive: true,
                    });
                    console.log(
                        `Admin user created with phone ${adminPhone}. Please set password securely if not handled by model.`
                    );
                } catch (error) {
                    console.error(
                        `Failed to create admin user with phone ${adminPhone}:`,
                        error.message
                    );
                }
            }

            if (adminUser) {
                await adminUser.setRoles([createdRoles.ADMINISTRATEUR]);
                console.log(
                    `Assigned ADMINISTRATEUR role to user ${adminUser.email || adminUser.phoneNumber}.`
                );
            } else {
                console.log(
                    "Admin user not found and ADMIN_PASSWORD not set in .env, skipping admin role assignment."
                );
            }
        }

        console.log("RBAC Seeding completed successfully.");
    } catch (error) {
        console.error("Error seeding database for RBAC:", error);
    } finally {
        // await sequelize.close();
    }
}

if (
    import.meta.url === `file://${process.argv[1]}` &&
    process.env.NODE_ENV !== "test"
) {
    console.log("Running RBAC Seeder...");
    seedDatabase()
        .then(() => {
            console.log("Seeder finished. Exiting.");
            process.exit(0);
        })
        .catch((err) => {
            console.error("Seeder failed:", err);
            process.exit(1);
        });
}

export { seedDatabase };
