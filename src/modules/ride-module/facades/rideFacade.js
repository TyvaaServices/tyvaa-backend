import rideService from "../services/rideService.js";

const rideFacade = {
    getAllRides: async () => rideService.getAllRides(),
    getRideById: async (id) => rideService.getRideById(id),
    createRide: async (data) => rideService.createRide(data),
    updateRide: async (id, data) => rideService.updateRide(id, data),
    deleteRide: async (id) => rideService.deleteRide(id),
    getAllRideInstances: async () => rideService.getAllRideInstances(),
    getRideInstanceById: async (id) => rideService.getRideInstanceById(id),
    createRideInstance: async (data) => rideService.createRideInstance(data),
    updateRideInstance: async (id, data) =>
        rideService.updateRideInstance(id, data),
    deleteRideInstance: async (id) => rideService.deleteRideInstance(id),
    acceptRide: async (id) => rideService.acceptRide(id),
    rejectRide: async (id) => rideService.rejectRide(id),
    completeRide: async (id) => rideService.completeRide(id),
    getAvailableRides: async () => rideService.getAvailableRideInstances(),
    searchRideInstanceByDepartureAndDestination: async (
        departure,
        destination,
        date
    ) =>
        rideService.searchRideInstanceByDepartureAndDestination(
            departure,
            destination,
            date
        ),
};

export default rideFacade;
