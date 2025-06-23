import fp from 'fastify-plugin';

async function rbacPlugin(fastify, opts) {
    /**
     * Decorator to check if the authenticated user has a specific permission.
     * This should be used *after* an authentication middleware (like fastify.authenticate)
     * has successfully authenticated a user and attached it to `request.user`.
     *
     * @param {string} requiredPermission The name of the permission required to access the route.
     */
    fastify.decorate('checkPermission', function(requiredPermission) {
        return async function(request, reply) {
            if (!request.user) {
                request.log.warn('RBAC: No user found on request. Ensure authentication runs before permission check.');
                return reply.status(401).send({ message: 'Unauthorized. Authentication required.' });
            }


            const User = fastify.models.User; // Assuming models are attached to fastify instance
            if (!User) {
                 request.log.error('RBAC: User model not found on fastify.models. Ensure models are registered.');
                 return reply.status(500).send({ message: 'Internal Server Error: RBAC configuration issue.'});
            }

            const userInstance = await User.findByPk(request.user.id); // Assuming request.user.id is the user's primary key

            if (!userInstance) {
                request.log.warn(`RBAC: User with ID ${request.user.id} not found in database.`);
                return reply.status(403).send({ message: 'Forbidden. User not found or invalid.' });
            }

            const hasPerm = await userInstance.hasPermission(requiredPermission);
            if (!hasPerm) {
                request.log.info(`RBAC: User ${userInstance.id} denied access to resource requiring permission '${requiredPermission}'.`);
                return reply.status(403).send({ message: `Forbidden. Required permission: '${requiredPermission}'.` });
            }
        };
    });

    fastify.decorate('checkRole', function(requiredRole) {
        return async function(request, reply) {
            if (!request.user) {
                request.log.warn('RBAC: No user found on request for role check.');
                return reply.status(401).send({ message: 'Unauthorized. Authentication required.' });
            }
            const User = fastify.models.User;
            if (!User) {
                 request.log.error('RBAC: User model not found for role check.');
                 return reply.status(500).send({ message: 'Internal Server Error: RBAC configuration issue.'});
            }
            const userInstance = await User.findByPk(request.user.id);
            if (!userInstance) {
                request.log.warn(`RBAC: User with ID ${request.user.id} not found for role check.`);
                return reply.status(403).send({ message: 'Forbidden. User not found or invalid.' });
            }

            const hasRoleFlag = await userInstance.hasRole(requiredRole);
            if (!hasRoleFlag) {
                request.log.info(`RBAC: User ${userInstance.id} denied access to resource requiring role '${requiredRole}'.`);
                return reply.status(403).send({ message: `Forbidden. Required role: '${requiredRole}'.` });
            }
        };
    });
}

export default fp(rbacPlugin, { dependencies: ['@fastify/jwt'] });

export const modelsPlugin = fp(async function(fastify, opts) {
    const User = (await import('../modules/user-module/models/user.js')).default;
    const Role = (await import('../modules/user-module/models/role.js')).default;
    const Permission = (await import('../modules/user-module/models/permission.js')).default;

    fastify.decorate('models', {
        User,
        Role,
        Permission,
    });
});
