const swaggerOptions = {
    swagger: {
        info: {
            title: "Tyvaa API",
            description:
                "Documentation for the Tyvaa monolithic application. Includes all endpoints for users, rides, bookings, ratings, notifications, and chatbot.",
            version: "2.0.0",
        },
        host: `localhost:${process.env.PORT || 3000}`,
        schemes: ["http"],
        consumes: ["application/json"],
        produces: ["application/json"],
        tags: [
            {
                name: "Users",
                description: "User management and authentication",
            },
            {
                name: "Driver Applications",
                description: "Driver application submission and review",
            },
            {
                name: "Admin",
                description:
                    "Administrative tasks including RBAC and application management",
            },
            {
                name: "RBAC",
                description: "Role-Based Access Control management",
            },
            {
                name: "Rides",
                description: "Ride creation, search, and management",
            },
            {
                name: "Ride Instances",
                description:
                    "Management of specific occurrences of recurring rides",
            },
            { name: "Bookings", description: "Booking management" },
            { name: "Ratings", description: "Ride ratings" },
            { name: "Notifications", description: "User notifications" },
            { name: "Chatbot", description: "Support chatbot" },
            { name: "Health", description: "Health check" },
        ],
        securityDefinitions: {
            Bearer: {
                type: "apiKey",
                name: "Authorization",
                in: "header",
                description:
                    "Enter 'Bearer {token}' to access protected routes",
            },
        },
        parameters: {
            id: {
                name: "id",
                in: "path",
                required: true,
                type: "integer",
                description: "Resource identifier",
            },
        },
        responses: {
            NotFound: {
                description: "Resource not found",
            },
            Deleted: {
                description: "Resource deleted",
            },
        },
        paths: {
            "/health": {
                get: {
                    tags: ["Health"],
                    summary: "API health check",
                    responses: {
                        200: {
                            description: "API is healthy",
                            schema: {
                                type: "object",
                                properties: {
                                    status: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
            "/api/v1/users": {
                get: {
                    tags: ["Users"],
                    summary: "Get all users",
                    security: [{ Bearer: [] }],
                    responses: {
                        200: {
                            description: "List of users",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/User" },
                            },
                        },
                    },
                },
                post: {
                    tags: ["Users"],
                    summary: "Create a new user",
                    // No security on purpose, this is registration
                    parameters: [
                        {
                            in: "body",
                            name: "user",
                            schema: { $ref: "#/definitions/User" },
                        },
                    ],
                    responses: {
                        201: {
                            description: "User created",
                            schema: { $ref: "#/definitions/User" },
                        },
                    },
                },
            },
            "/api/v1/users/{id}": {
                get: {
                    tags: ["Users"],
                    summary: "Get user by ID",
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: {
                            description: "User found",
                            schema: { $ref: "#/definitions/User" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                put: {
                    tags: ["Users"],
                    summary: "Update user by ID",
                    parameters: [
                        { $ref: "#/swagger/parameters/id" },
                        {
                            in: "body",
                            name: "user",
                            schema: { $ref: "#/definitions/User" },
                        },
                    ],
                    responses: {
                        200: {
                            description: "User updated",
                            schema: { $ref: "#/definitions/User" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                delete: {
                    tags: ["Users"],
                    summary: "Delete user by ID",
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: { $ref: "#/swagger/responses/Deleted" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/users/request-login-otp": {
                post: {
                    tags: ["Users"],
                    summary: "Request OTP for login",
                    parameters: [
                        {
                            in: "body",
                            name: "credentials",
                            schema: {
                                type: "object",
                                properties: {
                                    phone: { type: "string" },
                                },
                                required: ["phone"],
                            },
                        },
                    ],
                    responses: {
                        200: { description: "OTP sent successfully" },
                        400: { description: "Invalid request" },
                    },
                },
            },
            "/api/v1/users/request-register-otp": {
                post: {
                    tags: ["Users"],
                    summary: "Request OTP for registration",
                    parameters: [
                        {
                            in: "body",
                            name: "userInfo",
                            schema: {
                                type: "object",
                                properties: {
                                    phone: { type: "string" },
                                    email: { type: "string", format: "email" },
                                    name: { type: "string" },
                                },
                                required: ["phone", "email", "name"],
                            },
                        },
                    ],
                    responses: {
                        200: { description: "OTP sent successfully" },
                        400: { description: "Invalid request" },
                    },
                },
            },
            "/api/v1/users/verify": {
                post: {
                    tags: ["Users"],
                    summary: "Verify OTP and login/register user",
                    parameters: [
                        {
                            in: "body",
                            name: "verificationData",
                            schema: {
                                type: "object",
                                properties: {
                                    phone: { type: "string" },
                                    otp: { type: "string" },
                                },
                                required: ["phone", "otp"],
                            },
                        },
                    ],
                    responses: {
                        200: {
                            description:
                                "User logged in/registered successfully",
                            schema: { $ref: "#/definitions/User" },
                        },
                        400: { description: "Invalid OTP or request" },
                    },
                },
            },
            "/api/v1/users/{id}/fcm-token": {
                post: {
                    tags: ["Users"],
                    summary: "Update FCM token for a user",
                    security: [{ Bearer: [] }],
                    parameters: [
                        { $ref: "#/swagger/parameters/id" },
                        {
                            in: "body",
                            name: "fcmToken",
                            schema: {
                                type: "object",
                                properties: {
                                    fcmToken: { type: "string" },
                                },
                                required: ["fcmToken"],
                            },
                        },
                    ],
                    responses: {
                        200: { description: "FCM token updated" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/users/{id}/update-location": {
                post: {
                    tags: ["Users"],
                    summary: "Update user's location",
                    security: [{ Bearer: [] }],
                    parameters: [
                        { $ref: "#/swagger/parameters/id" },
                        {
                            in: "body",
                            name: "location",
                            schema: {
                                type: "object",
                                properties: {
                                    latitude: { type: "number" },
                                    longitude: { type: "number" },
                                },
                                required: ["latitude", "longitude"],
                            },
                        },
                    ],
                    responses: {
                        200: { description: "Location updated" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/users/driver-application": {
                post: {
                    tags: ["Users", "Driver Applications"],
                    summary: "Submit a driver application",
                    security: [{ Bearer: [] }],
                    consumes: ["multipart/form-data"],
                    parameters: [
                        {
                            in: "formData",
                            name: "document",
                            type: "file",
                            description:
                                "Driver's license or other identification document.",
                            required: true,
                        },
                        {
                            in: "formData",
                            name: "vehicleMake",
                            type: "string",
                            description: "Make of the vehicle",
                            required: true,
                        },
                        {
                            in: "formData",
                            name: "vehicleModel",
                            type: "string",
                            description: "Model of the vehicle",
                            required: true,
                        },
                        {
                            in: "formData",
                            name: "vehicleYear",
                            type: "integer",
                            description: "Year of the vehicle",
                            required: true,
                        },
                        {
                            in: "formData",
                            name: "licensePlate",
                            type: "string",
                            description: "License plate of the vehicle",
                            required: true,
                        },
                    ],
                    responses: {
                        201: {
                            description: "Driver application submitted",
                            schema: { $ref: "#/definitions/DriverApplication" },
                        },
                        400: { description: "Invalid application data" },
                    },
                },
                get: {
                    tags: ["Users", "Driver Applications"],
                    summary: "Get current user's driver application status",
                    security: [{ Bearer: [] }],
                    responses: {
                        200: {
                            description: "Driver application status",
                            schema: { $ref: "#/definitions/DriverApplication" },
                        },
                        404: { description: "Application not found" },
                    },
                },
            },
            "/api/v1/admin/driver-applications": {
                get: {
                    tags: ["Admin", "Driver Applications"],
                    summary: "Get all driver applications (Admin)",
                    security: [{ Bearer: [] }],
                    responses: {
                        200: {
                            description: "List of driver applications",
                            schema: {
                                type: "array",
                                items: {
                                    $ref: "#/definitions/DriverApplication",
                                },
                            },
                        },
                    },
                },
            },
            "/api/v1/admin/driver-applications/{id}/review": {
                patch: {
                    tags: ["Admin", "Driver Applications"],
                    summary: "Review a driver application (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        { $ref: "#/swagger/parameters/id" },
                        {
                            in: "body",
                            name: "review",
                            schema: {
                                type: "object",
                                properties: {
                                    status: {
                                        type: "string",
                                        enum: ["approved", "rejected"],
                                    },
                                    adminComments: { type: "string" },
                                },
                                required: ["status"],
                            },
                        },
                    ],
                    responses: {
                        200: {
                            description: "Driver application reviewed",
                            schema: { $ref: "#/definitions/DriverApplication" },
                        },
                        400: { description: "Invalid review data" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/admin/roles": {
                post: {
                    tags: ["Admin", "RBAC"],
                    summary: "Create a new role (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            in: "body",
                            name: "role",
                            schema: { $ref: "#/definitions/Role" },
                        },
                    ],
                    responses: {
                        201: {
                            description: "Role created",
                            schema: { $ref: "#/definitions/Role" },
                        },
                    },
                },
                get: {
                    tags: ["Admin", "RBAC"],
                    summary: "Get all roles (Admin)",
                    security: [{ Bearer: [] }],
                    responses: {
                        200: {
                            description: "List of roles",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/Role" },
                            },
                        },
                    },
                },
            },
            "/api/v1/admin/roles/{roleId}": {
                get: {
                    tags: ["Admin", "RBAC"],
                    summary: "Get role by ID (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            name: "roleId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Role identifier",
                        },
                    ],
                    responses: {
                        200: {
                            description: "Role found",
                            schema: { $ref: "#/definitions/Role" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                delete: {
                    tags: ["Admin", "RBAC"],
                    summary: "Delete role by ID (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            name: "roleId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Role identifier",
                        },
                    ],
                    responses: {
                        200: { $ref: "#/swagger/responses/Deleted" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/admin/permissions": {
                post: {
                    tags: ["Admin", "RBAC"],
                    summary: "Create a new permission (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            in: "body",
                            name: "permission",
                            schema: { $ref: "#/definitions/Permission" },
                        },
                    ],
                    responses: {
                        201: {
                            description: "Permission created",
                            schema: { $ref: "#/definitions/Permission" },
                        },
                    },
                },
                get: {
                    tags: ["Admin", "RBAC"],
                    summary: "Get all permissions (Admin)",
                    security: [{ Bearer: [] }],
                    responses: {
                        200: {
                            description: "List of permissions",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/Permission" },
                            },
                        },
                    },
                },
            },
            "/api/v1/admin/roles/{roleId}/permissions/{permissionId}": {
                post: {
                    tags: ["Admin", "RBAC"],
                    summary: "Assign a permission to a role (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            name: "roleId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Role identifier",
                        },
                        {
                            name: "permissionId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Permission identifier",
                        },
                    ],
                    responses: {
                        200: { description: "Permission assigned to role" },
                        404: { description: "Role or Permission not found" },
                    },
                },
                delete: {
                    tags: ["Admin", "RBAC"],
                    summary: "Remove a permission from a role (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            name: "roleId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Role identifier",
                        },
                        {
                            name: "permissionId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Permission identifier",
                        },
                    ],
                    responses: {
                        200: { description: "Permission removed from role" },
                        404: { description: "Role or Permission not found" },
                    },
                },
            },
            "/api/v1/admin/users/{userId}/roles": {
                get: {
                    tags: ["Admin", "RBAC"],
                    summary: "Get roles for a user (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            name: "userId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "User identifier",
                        },
                    ],
                    responses: {
                        200: {
                            description: "List of roles for the user",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/Role" },
                            },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/admin/users/{userId}/roles/{roleId}": {
                post: {
                    tags: ["Admin", "RBAC"],
                    summary: "Assign a role to a user (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            name: "userId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "User identifier",
                        },
                        {
                            name: "roleId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Role identifier",
                        },
                    ],
                    responses: {
                        200: { description: "Role assigned to user" },
                        404: { description: "User or Role not found" },
                    },
                },
                delete: {
                    tags: ["Admin", "RBAC"],
                    summary: "Remove a role from a user (Admin)",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            name: "userId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "User identifier",
                        },
                        {
                            name: "roleId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Role identifier",
                        },
                    ],
                    responses: {
                        200: { description: "Role removed from user" },
                        404: { description: "User or Role not found" },
                    },
                },
            },
            "/api/v1/rides": {
                get: {
                    tags: ["Rides"],
                    summary: "Get all rides",
                    responses: {
                        200: {
                            description: "List of rides",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/Ride" },
                            },
                        },
                    },
                },
                post: {
                    tags: ["Rides"],
                    summary: "Create a new ride",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            in: "body",
                            name: "ride",
                            schema: { $ref: "#/definitions/Ride" },
                        },
                    ],
                    responses: {
                        201: {
                            description: "Ride created",
                            schema: { $ref: "#/definitions/Ride" },
                        },
                    },
                },
            },
            "/api/v1/rides/{id}": {
                get: {
                    tags: ["Rides"],
                    summary: "Get ride by ID",
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: {
                            description: "Ride found",
                            schema: { $ref: "#/definitions/Ride" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                put: {
                    tags: ["Rides"],
                    summary: "Update ride by ID",
                    security: [{ Bearer: [] }],
                    parameters: [
                        { $ref: "#/swagger/parameters/id" },
                        {
                            in: "body",
                            name: "ride",
                            schema: { $ref: "#/definitions/Ride" },
                        },
                    ],
                    responses: {
                        200: {
                            description: "Ride updated",
                            schema: { $ref: "#/definitions/Ride" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                delete: {
                    tags: ["Rides"],
                    summary: "Delete ride by ID",
                    security: [{ Bearer: [] }],
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: { $ref: "#/swagger/responses/Deleted" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/rides/{id}/accept": {
                post: {
                    tags: ["Rides"],
                    summary: "Accept a ride (for drivers)",
                    security: [{ Bearer: [] }],
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: { description: "Ride accepted" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/rides/{id}/reject": {
                post: {
                    tags: ["Rides"],
                    summary: "Reject a ride (for drivers)",
                    security: [{ Bearer: [] }],
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: { description: "Ride rejected" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/rides/{id}/complete": {
                post: {
                    tags: ["Rides"],
                    summary: "Complete a ride (for drivers)",
                    security: [{ Bearer: [] }],
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: { description: "Ride completed" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/ride-instances": {
                get: {
                    tags: ["Rides", "Ride Instances"],
                    summary: "Get all ride instances",
                    security: [{ Bearer: [] }],
                    responses: {
                        200: {
                            description: "List of ride instances",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/RideInstance" },
                            },
                        },
                    },
                },
                post: {
                    tags: ["Rides", "Ride Instances"],
                    summary: "Create a new ride instance",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            in: "body",
                            name: "rideInstance",
                            schema: { $ref: "#/definitions/RideInstance" },
                        },
                    ],
                    responses: {
                        201: {
                            description: "Ride instance created",
                            schema: { $ref: "#/definitions/RideInstance" },
                        },
                    },
                },
            },
            "/api/v1/ride-instances/{id}": {
                get: {
                    tags: ["Rides", "Ride Instances"],
                    summary: "Get ride instance by ID",
                    security: [{ Bearer: [] }],
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: {
                            description: "Ride instance found",
                            schema: { $ref: "#/definitions/RideInstance" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                put: {
                    tags: ["Rides", "Ride Instances"],
                    summary: "Update ride instance by ID",
                    security: [{ Bearer: [] }],
                    parameters: [
                        { $ref: "#/swagger/parameters/id" },
                        {
                            in: "body",
                            name: "rideInstance",
                            schema: { $ref: "#/definitions/RideInstance" },
                        },
                    ],
                    responses: {
                        200: {
                            description: "Ride instance updated",
                            schema: { $ref: "#/definitions/RideInstance" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                delete: {
                    tags: ["Rides", "Ride Instances"],
                    summary: "Delete ride instance by ID",
                    security: [{ Bearer: [] }],
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: { $ref: "#/swagger/responses/Deleted" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/bookings": {
                get: {
                    tags: ["Bookings"],
                    summary: "Get all bookings (for user or admin)",
                    security: [{ Bearer: [] }],
                    responses: {
                        200: {
                            description: "List of bookings",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/Booking" },
                            },
                        },
                    },
                },
                post: {
                    tags: ["Bookings"],
                    summary: "Create a new booking",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            in: "body",
                            name: "booking",
                            schema: { $ref: "#/definitions/Booking" },
                        },
                    ],
                    responses: {
                        201: {
                            description: "Booking created",
                            schema: { $ref: "#/definitions/Booking" },
                        },
                    },
                },
            },
            "/api/v1/bookings/{id}": {
                get: {
                    tags: ["Bookings"],
                    summary: "Get booking by ID",
                    security: [{ Bearer: [] }],
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: {
                            description: "Booking found",
                            schema: { $ref: "#/definitions/Booking" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                put: {
                    tags: ["Bookings"],
                    summary: "Update booking by ID",
                    security: [{ Bearer: [] }],
                    parameters: [
                        { $ref: "#/swagger/parameters/id" },
                        {
                            in: "body",
                            name: "booking",
                            schema: { $ref: "#/definitions/Booking" },
                        },
                    ],
                    responses: {
                        200: {
                            description: "Booking updated",
                            schema: { $ref: "#/definitions/Booking" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
                delete: {
                    tags: ["Bookings"],
                    summary: "Delete booking by ID",
                    security: [{ Bearer: [] }],
                    parameters: [{ $ref: "#/swagger/parameters/id" }],
                    responses: {
                        200: { $ref: "#/swagger/responses/Deleted" },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/bookings/book": {
                post: {
                    tags: ["Bookings"],
                    summary: "Book a ride",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            in: "body",
                            name: "bookingDetails",
                            schema: {
                                type: "object",
                                properties: {
                                    rideInstanceId: { type: "integer" },
                                    seatsBooked: { type: "integer" },
                                },
                                required: ["rideInstanceId", "seatsBooked"],
                            },
                        },
                    ],
                    responses: {
                        201: {
                            description: "Ride booked successfully",
                            schema: { $ref: "#/definitions/Booking" },
                        },
                        400: {
                            description:
                                "Invalid booking details or ride not available",
                        },
                    },
                },
            },
            "/api/v1/bookings/{bookingId}/cancel": {
                post: {
                    tags: ["Bookings"],
                    summary: "Cancel a booking",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            name: "bookingId",
                            in: "path",
                            required: true,
                            type: "integer",
                            description: "Booking identifier",
                        },
                    ],
                    responses: {
                        200: {
                            description: "Booking cancelled successfully",
                            schema: { $ref: "#/definitions/Booking" },
                        },
                        404: { $ref: "#/swagger/responses/NotFound" },
                    },
                },
            },
            "/api/v1/ratings": {
                get: {
                    tags: ["Ratings"],
                    summary: "Get all ride ratings",
                    security: [{ Bearer: [] }], // Assuming users need to be logged in to see ratings
                    responses: {
                        200: {
                            description: "List of ratings",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/Rating" },
                            },
                        },
                    },
                },
                post: {
                    tags: ["Ratings"],
                    summary: "Create a new rating",
                    security: [{ Bearer: [] }],
                    parameters: [
                        {
                            in: "body",
                            name: "rating",
                            schema: { $ref: "#/definitions/Rating" },
                        },
                    ],
                    responses: {
                        201: {
                            description: "Rating created",
                            schema: { $ref: "#/definitions/Rating" },
                        },
                    },
                },
            },
            "/api/v1/notifications": {
                get: {
                    tags: ["Notifications"],
                    summary: "Get all notifications for the authenticated user",
                    security: [{ Bearer: [] }],
                    responses: {
                        200: {
                            description: "List of notifications",
                            schema: {
                                type: "array",
                                items: { $ref: "#/definitions/Notification" },
                            },
                        },
                    },
                },
            },
            "/api/v1/notifications/send-notification": {
                post: {
                    tags: ["Notifications"],
                    summary:
                        "Send a push notification (primarily for server-to-server or admin use)",
                    security: [{ Bearer: [] }], // Or a different security scheme if applicable
                    parameters: [
                        {
                            in: "body",
                            name: "notificationPayload",
                            schema: {
                                $ref: "#/definitions/NotificationRequest",
                            },
                        },
                    ],
                    responses: {
                        200: {
                            description: "Notification sent successfully",
                            schema: {
                                type: "object",
                                properties: {
                                    status: { type: "string" },
                                },
                            },
                        },
                        400: { description: "Invalid request payload" },
                    },
                },
            },
            "/api/v1/chatbot": {
                post: {
                    tags: ["Chatbot"],
                    summary: "Interact with the support chatbot",
                    description:
                        "Send a message to the support chatbot and get a reply. Optionally include conversation history.",
                    parameters: [
                        {
                            in: "body",
                            name: "chatRequest",
                            required: true,
                            schema: { $ref: "#/definitions/ChatRequestBody" },
                        },
                    ],
                    responses: {
                        200: {
                            description: "Successful chatbot reply",
                            schema: {
                                type: "object",
                                properties: {
                                    reply: { type: "string" },
                                },
                            },
                        },
                        400: {
                            description: "Invalid request body",
                            schema: {
                                type: "object",
                                properties: {
                                    error: { type: "string" },
                                    message: { type: "string" },
                                    issues: {
                                        type: "array",
                                        items: { type: "object" },
                                    },
                                },
                            },
                        },
                        500: {
                            description: "Server error",
                            schema: {
                                type: "object",
                                properties: {
                                    error: { type: "string" },
                                    message: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        definitions: {
            ChatRequestBody: {
                type: "object",
                required: ["message", "personality"],
                properties: {
                    message: {
                        type: "string",
                        minLength: 1,
                        description: "User's message to the chatbot.",
                    },
                    personality: {
                        type: "string",
                        enum: ["f", "m"],
                        description:
                            "Personality of the chatbot (f for female, m for male).",
                    },
                    history: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["text", "isUserMessage"],
                            properties: {
                                text: {
                                    type: "string",
                                    minLength: 1,
                                    description:
                                        "Text of the message in history.",
                                },
                                isUserMessage: {
                                    type: "boolean",
                                    description:
                                        "True if the message was from the user, false if from the chatbot.",
                                },
                            },
                        },
                        description: "Optional conversation history.",
                    },
                },
            },
            User: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    email: { type: "string" },
                    password: { type: "string" },
                    isDriver: { type: "boolean" },
                    phone: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            DriverApplication: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    userId: { type: "integer" },
                    documentUrl: { type: "string" },
                    vehicleMake: { type: "string" },
                    vehicleModel: { type: "string" },
                    vehicleYear: { type: "integer" },
                    licensePlate: { type: "string" },
                    status: {
                        type: "string",
                        enum: ["pending", "approved", "rejected"],
                    },
                    adminComments: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            Role: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string", unique: true },
                    description: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            Permission: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string", unique: true },
                    description: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            Ride: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    driverId: { type: "integer" },
                    departure: { type: "string" },
                    destination: { type: "string" },
                    seatsAvailable: { type: "integer" },
                    recurrence: { type: "array", items: { type: "string" } },
                    comment: { type: "string" },
                    price: { type: "integer" },
                    status: {
                        type: "string",
                        enum: ["active", "cancelled", "completed"],
                    },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
                    time: { type: "string", format: "time" },
                    isRecurring: { type: "boolean" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            RideInstance: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    rideId: { type: "integer" },
                    rideDateTime: { type: "string", format: "date-time" },
                    status: {
                        type: "string",
                        enum: [
                            "scheduled",
                            "cancelled",
                            "completed",
                            "in_progress",
                        ],
                    },
                    availableSeats: { type: "integer" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            Booking: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    userId: { type: "integer" },
                    rideInstanceId: { type: "integer" },
                    seatsBooked: { type: "integer" },
                    status: { type: "string", enum: ["booked", "cancelled"] },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            Rating: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    userId: { type: "integer" },
                    rideInstanceId: { type: "integer" },
                    rating: { type: "integer", minimum: 1, maximum: 5 },
                    comment: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            Notification: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    userId: { type: "integer" },
                    message: { type: "string" },
                    read: { type: "boolean" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            NotificationRequest: {
                type: "object",
                required: ["token", "eventType", "data"],
                properties: {
                    token: { type: "string", description: "FCM device token" },
                    eventType: {
                        type: "string",
                        description:
                            "Type of event triggering the notification (e.g., RIDER_ACCEPT_RIDE)",
                    },
                    data: {
                        type: "object",
                        description:
                            "Additional data for the notification template",
                    },
                },
            },
        },
    },
};

const swaggerUiOptions = {
    routePrefix: "/docs",
    exposeRoute: true,
};

export default {
    options: swaggerOptions,
    uiOptions: swaggerUiOptions,
};
