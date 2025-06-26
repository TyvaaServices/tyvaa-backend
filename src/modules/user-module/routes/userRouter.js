import { userControllerFactory } from "./../controllers/userController.js";

async function userRoutes(fastify, opts) {
    const userController = userControllerFactory(fastify);

    fastify.get(
        "/users",
        {
            preValidation: [
                // fastify.authenticate,
                // fastify.checkRole("CHAUFFEUR"),
                // fastify.checkPermission("publier_trajet"),
            ],
        },
        userController.getAllUsers
    );
    fastify.post("/users/request-login-otp", userController.requestLoginOtp);
    fastify.post(
        "/users/request-register-otp",
        userController.requestRegisterOtp
    );
    fastify.post("/users/verify", userController.login);
    fastify.get("/users/:id", userController.getUserById);
    fastify.post("/users/register", userController.createUser);
    fastify.put("/users/:id", userController.updateUser);
    fastify.delete("/users/:id", userController.deleteUser);
    fastify.post("/users/:id/fcm-token", userController.updateFcmToken);
    fastify.post("/users/:id/update-location", userController.updateLocation);

    fastify.post(
        "/users/driver-application",
        { preValidation: [fastify.authenticate] },
        userController.submitDriverApplication
    );
    fastify.get(
        "/users/driver-application/status",
        { preValidation: [fastify.authenticate] },
        userController.getDriverApplicationStatus
    );
    fastify.get(
        "/admin/driver-applications",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("voir_candidatures"),
            ],
        },
        userController.getAllDriverApplications
    );
    fastify.patch(
        "/admin/driver-applications/:id/review",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("valider_candidature"),
            ],
        },
        userController.reviewDriverApplication
    );

    const adminCtrl = await import("../controllers/adminController.js");

    fastify.post(
        "/admin/roles",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("gerer_roles"),
            ],
        },
        adminCtrl.createRole
    );
    fastify.get(
        "/admin/roles",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("gerer_roles"),
            ],
        },
        adminCtrl.getAllRoles
    );
    fastify.get(
        "/admin/roles/:roleId",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("gerer_roles"),
            ],
        },
        adminCtrl.getRoleById
    );
    fastify.delete(
        "/admin/roles/:roleId",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("gerer_roles"),
            ],
        },
        adminCtrl.deleteRole
    );

    fastify.post(
        "/admin/permissions",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("gerer_permissions"),
            ],
        },
        adminCtrl.createPermission
    );
    fastify.get(
        "/admin/permissions",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("gerer_permissions"),
            ],
        },
        adminCtrl.getAllPermissions
    );

    // Role-Permission Assignment
    fastify.post(
        "/admin/roles/:roleId/permissions/:permissionId",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("gerer_roles"),
            ],
        },
        adminCtrl.assignPermissionToRole
    );
    fastify.delete(
        "/admin/roles/:roleId/permissions/:permissionId",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("gerer_roles"),
            ],
        },
        adminCtrl.removePermissionFromRole
    );

    fastify.get(
        "/admin/users/:userId/roles",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("attribuer_roles"),
            ],
        },
        adminCtrl.getUserRoles
    );
    fastify.post(
        "/admin/users/:userId/roles/:roleId",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("attribuer_roles"),
            ],
        },
        adminCtrl.assignRoleToUser
    );
    fastify.delete(
        "/admin/users/:userId/roles/:roleId",
        {
            preValidation: [
                fastify.authenticate,
                fastify.checkPermission("attribuer_roles"),
            ],
        },
        adminCtrl.removeRoleFromUser
    );
}

export default userRoutes;
