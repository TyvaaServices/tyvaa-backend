import fp from "fastify-plugin";
import { User } from "#config/index.js";
/**
 * RBAC plugin that adds `checkPermission` and `checkRole` decorators to Fastify.
 * These decorators are intended to be used as `preValidation` hooks in route options.
 *
 * @param {import('fastify').FastifyInstance & { models?: any }} fastify - The Fastify instance.
 * @param {Object} opts - Plugin options.
 */
async function rbacPlugin(fastify, opts) {
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
            const userInstance = await User.findByPk(request.user.id);

            if (!userInstance) {
                request.log.warn(
                    `RBAC: User with ID ${request.user.id} not found in database.`
                );
                return reply
                    .status(403)
                    .send({ message: "Forbidden. User not found or invalid." });
            }

            const hasPerm =
                await userInstance.hasPermission(requiredPermission);
            if (!hasPerm) {
                request.log.info(
                    `RBAC: User ${userInstance.id} denied access to resource requiring permission '${requiredPermission}'.`
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
            if (!User || typeof User.findByPk !== "function") {
                request.log.error("RBAC: User model not found for role check.");
                return reply.status(500).send({
                    message: "Internal Server Error: RBAC configuration issue.",
                });
            }
            const userInstance = await User.findByPk(request.user.id);
            if (!userInstance) {
                request.log.warn(
                    `RBAC: User with ID ${request.user.id} not found for role check.`
                );
                return reply
                    .status(403)
                    .send({ message: "Forbidden. User not found or invalid." });
            }

            const hasRoleFlag = await userInstance.hasRole(requiredRole);
            if (!hasRoleFlag) {
                request.log.info(
                    `RBAC: User ${userInstance.id} denied access to resource requiring role '${requiredRole}'.`
                );
                return reply.status(403).send({
                    message: `Forbidden. Required role: '${requiredRole}'.`,
                });
            }
        };
    });
}

export default fp(rbacPlugin, { dependencies: ["@fastify/jwt"] });
