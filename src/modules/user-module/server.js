const userRoutes = require("./routes/userRouter");

require("dotenv").config();
module.exports = async function (fastify, opts) {
  fastify.register(require("@fastify/multipart"));
  fastify.register(userRoutes, { prefix: "/api/v1" });
};
