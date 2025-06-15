const userControllerFactory = require("./../controllers/userController");

async function userRoutes(fastify, opts) {
  const userController = userControllerFactory(fastify);

  fastify.get("/users", userController.getAllUsers);
  fastify.post("/users/request-login-otp", userController.requestLoginOtp);
  fastify.post(
    "/users/request-register-otp",
    userController.requestRegisterOtp
  );
  fastify.post("/users/login", userController.login);
  fastify.get("/users/:id", userController.getUserById);
  fastify.post("/users/register", userController.createUser);
  fastify.put("/users/:id", userController.updateUser);
  fastify.delete("/users/:id", userController.deleteUser);
  fastify.post("/users/:id/fcm-token", userController.updateFcmToken);
  fastify.post("/users/:id/update-location", userController.updateLocation);

  fastify.post(
    "/users/driver-application",{ preValidation: [fastify.authenticate] },
    userController.submitDriverApplication
  );
  fastify.get(
    "/users/driver-application/status",
    { preValidation: [fastify.authenticate] },
    userController.getDriverApplicationStatus
  );


}

module.exports = userRoutes;
