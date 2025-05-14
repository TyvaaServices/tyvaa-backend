const axios = require('axios');

async function verifyTokenMiddleware(req, reply) {
    try {
        const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header
        if (!token) {
            return reply.code(401).send({error: 'Token is missing'});
        }
        console.log(token);
        const response = await axios.post(`${process.env.AUTH_SERVICE_URL}/api/v1/verify`, {token});
        if (!response.data.valid) {
            return reply.code(401).send({error: 'Invalid token'});
        }

        req.user = response.data.decoded; // Attach decoded token data to the request
    } catch (error) {
        return reply.code(401).send({error: 'Token verification failed', message: error.message});
    }
}

module.exports = verifyTokenMiddleware;