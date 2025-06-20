const auditRoutes = require("./routes/auditRouter");
const auditPlugin = require("./plugins/auditPlugin");

require("dotenv").config();
module.exports = async function (fastify, opts) {
    fastify.register(auditPlugin);
    fastify.register(auditRoutes, { prefix: "/api/v1" });
};
