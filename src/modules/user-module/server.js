const userRoutes = require("./routes/userRouter");
const adminRoutes = require("./routes/adminRouter");

require("dotenv").config();
module.exports = async function (fastify, opts) {
  fastify.register(require("@fastify/multipart"));
  fastify.register(userRoutes, { prefix: "/api/v1" });
  fastify.register(adminRoutes, { prefix: "/api/v1" });
};
