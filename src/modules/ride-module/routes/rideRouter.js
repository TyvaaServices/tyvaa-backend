import rideController from "../controllers/rideController.js";

async function rideRoutes(fastify, _opts) {
    fastify.get("/rides", rideController.getAllRides);
    fastify.get("/rides/:id", rideController.getRideById);
    fastify.post("/rides", rideController.createRide);
    fastify.put("/rides/:id", rideController.updateRide);
    fastify.delete("/rides/:id", rideController.deleteRide);
    fastify.post("/rides/:id/accept", rideController.acceptRide);
    fastify.post("/rides/:id/reject", rideController.rejectRide);
    fastify.post("/rides/:id/complete", rideController.completeRide);

    fastify.get("/ride-instances", rideController.getAllRideInstances);
    fastify.get("/ride-instances/:id", rideController.getRideInstanceById);
    fastify.post("/ride-instances", rideController.createRideInstance);
    fastify.put("/ride-instances/:id", rideController.updateRideInstance);
    fastify.delete("/ride-instances/:id", rideController.deleteRideInstance);
    fastify.get("/ride-instances/available", rideController.getAvailableRides);
    fastify.get(
        "/rides/search",
        rideController.searchRideInstanceByDepartureAndDestination
    );
}

export default rideRoutes;
