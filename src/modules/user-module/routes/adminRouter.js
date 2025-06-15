const adminControllerFactory = require("./../controllers/adminController");

async function adminRoutes(fastify, opts) {
  const adminController = adminControllerFactory(fastify);

  fastify.post("/admin/request-login-otp", adminController.requestLoginOtp);
  fastify.post("/admin/login", adminController.login);

  fastify.get(
    "/admin/driver-applications",
    { preValidation: [fastify.authenticate, fastify.isAdmin] },
    adminController.getAllDriverApplications
  );
  fastify.patch(
    "/admin/driver-applications/:id/review",
    { preValidation: [fastify.authenticate, fastify.isAdmin] },
    adminController.reviewDriverApplication
  );
}

module.exports = adminRoutes;
