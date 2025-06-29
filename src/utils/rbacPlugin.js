import fp from "fastify-plugin";
import { User, Role } from "#config/index.js"; // Added Role

/**
 * RBAC plugin that adds `checkPermission` and `checkRole` decorators to Fastify.
 * These decorators are intended to be used as `preValidation` hooks in route options.
 *
 * @param {import("fastify").FastifyInstance & { models?: any }} fastify - The Fastify instance.
 * @param {Object} _opts - Plugin options.
 */
async function rbacPlugin(fastify, _opts) {
    /**
     * Decorator function (a preValidation hook factory) to check if the authenticated user
     * has a specific permission.
     * This should be used after authentication middleware attaches `request.user`.
     *
     * @param {string} requiredPermission - The name of the permission required to access the route.
     * @returns {Function} A Fastify preValidation hook.
     *
     * Responds immediately with 401 if user is not authenticated,
     * 500 if the User model is not available,
     * or 403 if the user does not exist in DB or lacks the required permission.
     */
    fastify.decorate("checkPermission", function (requiredPermission) {
        return async function (request, reply) {
            if (!request.user) {
                request.log.warn(
                    "RBAC: No user found on request. Ensure authentication runs before permission check."
                );
                return reply.status(401).send({
                    message: "Unauthorized. Authentication required.",
                });
            }

            if (!User || typeof User.findByPk !== "function") {
                request.log.error(
                    "RBAC: User model not found on fastify.models. Ensure models are registered."
                );
                reply.status(500).send({
                    message: "Internal Server Error: RBAC configuration issue.",
                });
                return;
            }

            if (!request.user.roles || !Array.isArray(request.user.roles)) {
                request.log.warn(
                    `RBAC: Roles not found or not an array in JWT payload for user ID ${request.user.id} (permission check).`
                );
                return reply.status(403).send({
                    message: "Forbidden. User roles not available in token for permission check.",
                });
            }

            // Fetch permissions for the roles found in the JWT
            // This still requires DB access but avoids fetching the user and then their roles.
            const userRolesFromJWT = request.user.roles;
            let hasPerm = false;

            try {
                if (userRolesFromJWT.length > 0) {
                    if (typeof Role.findAll !== "function") {
                        request.log.error(
                            "RBAC: Role.findAll is not a function. Check Role model import/definition."
                        );
                        return reply.status(500).send({
                            message:
                                "Internal Server Error: RBAC configuration issue (Role model).",
                        });
                    }
                    const rolesWithPermissions = await Role.findAll({
                        where: {
                            name: userRolesFromJWT, // Assuming role names in JWT match DB
                        },
                        include: [
                            {
                                association: "Permissions", // This 'Permissions' should match the alias in Role model definition if any, or the model name
                                where: { name: requiredPermission },
                                required: true, // Ensures only roles with the specific permission are returned
                            },
                        ],
                    });

                    if (rolesWithPermissions && rolesWithPermissions.length > 0) {
                        hasPerm = true;
                    }
                }
            } catch (dbError) {
                request.log.error(
                    { err: dbError },
                    "RBAC: Database error during permission check (Role.findAll)."
                );
                return reply.status(500).send({
                    message: "Internal Server Error while checking permissions.",
                });
            }

            if (!hasPerm) {
                request.log.info(
                    `RBAC: User ${request.user.id} (roles: ${userRolesFromJWT.join(", ")}) denied access to resource requiring permission '${requiredPermission}'.`
                );
                return reply.status(403).send({
                    message: `Forbidden. Required permission: '${requiredPermission}'.`,
                });
            }
        };
    });

    /**
     * Decorator function (a preValidation hook factory) to check if the authenticated user
     * has a specific role.
     * Requires `fastify.authenticate` and `modelsPlugin` similar to `checkPermission`.
     *
     * @param {string} requiredRole - The name of the role required for the route.
     * @returns {Function} A Fastify preValidation hook.
     *
     * Responds immediately with 401 if user is not authenticated,
     * 500 if the User model is not available,
     * or 403 if the user does not exist in DB or lacks the required role.
     */
    fastify.decorate("checkRole", function (requiredRole) {
        return async function (request, reply) {
            if (!request.user) {
                request.log.warn(
                    "RBAC: No user found on request for role check."
                );
                return reply.status(401).send({
                    message: "Unauthorized. Authentication required.",
                });
            }
            if (!request.user.roles || !Array.isArray(request.user.roles)) {
                request.log.warn(
                    `RBAC: Roles not found or not an array in JWT payload for user ID ${request.user.id}.`
                );
                return reply.status(403).send({
                    message: "Forbidden. User roles not available in token.",
                });
            }

            const hasRoleFlag = request.user.roles.includes(requiredRole);

            if (!hasRoleFlag) {
                request.log.info(
                    `RBAC: User ${request.user.id} denied access to resource requiring role '${requiredRole}'. User roles: ${request.user.roles.join(", ")}`
                );
                return reply.status(403).send({
                    message: `Forbidden. Required role: '${requiredRole}'.`,
                });
            }
        };
    });
}

export default fp(rbacPlugin, { dependencies: ["@fastify/jwt"] });
