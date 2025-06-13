const axios = require('axios');

/**
 * Middleware to verify JWT token by calling the auth-service.
 * If valid, attaches user data to request; else, returns 401.
 */
async function authMiddleware(req, reply) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({error: 'No token provided'});
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const response = await axios.get('http://localhost:2001/api/v1/auth/verify', {
            headers: {Authorization: `Bearer ${token}`}
        });
        req.user = response.data.user;
    } catch (err) {
        return reply.code(401).send({error: 'Invalid or expired token'});
    }
}

module.exports = authMiddleware;

