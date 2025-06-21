const swaggerOptions = {
    swagger: {
        info: {
            title: 'Tyvaa API',
            description: 'Documentation for the Tyvaa monolithic application. Includes all endpoints for users, rides, bookings, ratings, notifications, and chatbot.',
            version: '2.0.0',
        },
        host: `localhost:${process.env.PORT || 3000}`,
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
            {name: 'Users', description: 'User management and authentication'},
            {name: 'Rides', description: 'Ride creation, search, and management'},
            {name: 'Bookings', description: 'Booking management'},
            {name: 'Ratings', description: 'Ride ratings'},
            {name: 'Notifications', description: 'User notifications'},
            {name: 'Chatbot', description: 'Support chatbot'},
            {name: 'Health', description: 'Health check'},
        ],
        securityDefinitions: {
            Bearer: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header',
                description: "Enter 'Bearer {token}' to access protected routes",
            },
        },
        paths: {
            '/health': {
                get: {
                    tags: ['Health'],
                    summary: 'API health check',
                    responses: {
                        '200': {
                            description: 'API is healthy',
                            schema: {
                                type: 'object',
                                properties: {
                                    status: {type: 'string'},
                                },
                            },
                        },
                    },
                },
            },
            '/api/v1/users': {
                get: {
                    tags: ['Users'],
                    summary: 'Get all users',
                    responses: {
                        '200': {
                            description: 'List of users',
                            schema: {type: 'array', items: {$ref: '#/definitions/User'}}
                        },
                    },
                },
                post: {
                    tags: ['Users'],
                    summary: 'Create a new user',
                    parameters: [{in: 'body', name: 'user', schema: {$ref: '#/definitions/User'}}],
                    responses: {
                        '201': {description: 'User created', schema: {$ref: '#/definitions/User'}},
                    },
                },
            },
            '/api/v1/users/{id}': {
                get: {
                    tags: ['Users'],
                    summary: 'Get user by ID',
                    parameters: [{in: 'path', name: 'id', required: true, type: 'integer'}],
                    responses: {
                        '200': {description: 'User found', schema: {$ref: '#/definitions/User'}},
                        '404': {description: 'User not found'},
                    },
                },
                put: {
                    tags: ['Users'],
                    summary: 'Update user by ID',
                    parameters: [
                        {in: 'path', name: 'id', required: true, type: 'integer'},
                        {in: 'body', name: 'user', schema: {$ref: '#/definitions/User'}},
                    ],
                    responses: {
                        '200': {description: 'User updated', schema: {$ref: '#/definitions/User'}},
                        '404': {description: 'User not found'},
                    },
                },
                delete: {
                    tags: ['Users'],
                    summary: 'Delete user by ID',
                    parameters: [{in: 'path', name: 'id', required: true, type: 'integer'}],
                    responses: {
                        '200': {description: 'User deleted'},
                        '404': {description: 'User not found'},
                    },
                },
            },
            '/api/v1/rides': {
                get: {
                    tags: ['Rides'],
                    summary: 'Get all rides',
                    responses: {
                        '200': {
                            description: 'List of rides',
                            schema: {type: 'array', items: {$ref: '#/definitions/Ride'}}
                        },
                    },
                },
                post: {
                    tags: ['Rides'],
                    summary: 'Create a new ride',
                    parameters: [{in: 'body', name: 'ride', schema: {$ref: '#/definitions/Ride'}}],
                    responses: {
                        '201': {description: 'Ride created', schema: {$ref: '#/definitions/Ride'}},
                    },
                },
            },
            '/api/v1/rides/{id}': {
                get: {
                    tags: ['Rides'],
                    summary: 'Get ride by ID',
                    parameters: [{in: 'path', name: 'id', required: true, type: 'integer'}],
                    responses: {
                        '200': {description: 'Ride found', schema: {$ref: '#/definitions/Ride'}},
                        '404': {description: 'Ride not found'},
                    },
                },
                put: {
                    tags: ['Rides'],
                    summary: 'Update ride by ID',
                    parameters: [
                        {in: 'path', name: 'id', required: true, type: 'integer'},
                        {in: 'body', name: 'ride', schema: {$ref: '#/definitions/Ride'}},
                    ],
                    responses: {
                        '200': {description: 'Ride updated', schema: {$ref: '#/definitions/Ride'}},
                        '404': {description: 'Ride not found'},
                    },
                },
                delete: {
                    tags: ['Rides'],
                    summary: 'Delete ride by ID',
                    parameters: [{in: 'path', name: 'id', required: true, type: 'integer'}],
                    responses: {
                        '200': {description: 'Ride deleted'},
                        '404': {description: 'Ride not found'},
                    },
                },
            },
            '/api/v1/bookings': {
                get: {
                    tags: ['Bookings'],
                    summary: 'Get all bookings',
                    responses: {
                        '200': {
                            description: 'List of bookings',
                            schema: {type: 'array', items: {$ref: '#/definitions/Booking'}}
                        },
                    },
                },
                post: {
                    tags: ['Bookings'],
                    summary: 'Create a new booking',
                    parameters: [{in: 'body', name: 'booking', schema: {$ref: '#/definitions/Booking'}}],
                    responses: {
                        '201': {description: 'Booking created', schema: {$ref: '#/definitions/Booking'}},
                    },
                },
            },
            '/api/v1/bookings/{id}': {
                get: {
                    tags: ['Bookings'],
                    summary: 'Get booking by ID',
                    parameters: [{in: 'path', name: 'id', required: true, type: 'integer'}],
                    responses: {
                        '200': {description: 'Booking found', schema: {$ref: '#/definitions/Booking'}},
                        '404': {description: 'Booking not found'},
                    },
                },
                put: {
                    tags: ['Bookings'],
                    summary: 'Update booking by ID',
                    parameters: [
                        {in: 'path', name: 'id', required: true, type: 'integer'},
                        {in: 'body', name: 'booking', schema: {$ref: '#/definitions/Booking'}},
                    ],
                    responses: {
                        '200': {description: 'Booking updated', schema: {$ref: '#/definitions/Booking'}},
                        '404': {description: 'Booking not found'},
                    },
                },
                delete: {
                    tags: ['Bookings'],
                    summary: 'Delete booking by ID',
                    parameters: [{in: 'path', name: 'id', required: true, type: 'integer'}],
                    responses: {
                        '200': {description: 'Booking deleted'},
                        '404': {description: 'Booking not found'},
                    },
                },
            },
            '/api/v1/ratings': {
                get: {
                    tags: ['Ratings'],
                    summary: 'Get all ride ratings',
                    responses: {
                        '200': {
                            description: 'List of ratings',
                            schema: {type: 'array', items: {$ref: '#/definitions/Rating'}}
                        },
                    },
                },
                post: {
                    tags: ['Ratings'],
                    summary: 'Create a new rating',
                    parameters: [{in: 'body', name: 'rating', schema: {$ref: '#/definitions/Rating'}}],
                    responses: {
                        '201': {description: 'Rating created', schema: {$ref: '#/definitions/Rating'}},
                    },
                },
            },
            '/api/v1/notifications': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Get all notifications',
                    responses: {
                        '200': {
                            description: 'List of notifications',
                            schema: {type: 'array', items: {$ref: '#/definitions/Notification'}}
                        },
                    },
                },
            },
            '/api/v1/chatbot': {
                post: {
                    tags: ['Chatbot'],
                    summary: 'Interact with the support chatbot',
                    parameters: [{
                        in: 'body',
                        name: 'message',
                        schema: {
                            type: 'object',
                            properties: {message: {type: 'string'}, personality: {type: 'string', enum: ['f', 'm']}}
                        }
                    }],
                    responses: {
                        '200': {
                            description: 'Chatbot reply',
                            schema: {type: 'object', properties: {reply: {type: 'string'}}}
                        },
                    },
                },
            },
        },
        definitions: {
            User: {
                type: 'object',
                properties: {
                    id: {type: 'integer'},
                    name: {type: 'string'},
                    email: {type: 'string'},
                    password: {type: 'string'},
                    isDriver: {type: 'boolean'},
                    phone: {type: 'string'},
                    createdAt: {type: 'string', format: 'date-time'},
                    updatedAt: {type: 'string', format: 'date-time'},
                },
            },
            Ride: {
                type: 'object',
                properties: {
                    id: {type: 'integer'},
                    driverId: {type: 'integer'},
                    departure: {type: 'string'},
                    destination: {type: 'string'},
                    seatsAvailable: {type: 'integer'},
                    recurrence: {type: 'array', items: {type: 'string'}},
                    comment: {type: 'string'},
                    price: {type: 'integer'},
                    status: {type: 'string', enum: ['active', 'cancelled', 'completed']},
                    startDate: {type: 'string', format: 'date'},
                    endDate: {type: 'string', format: 'date'},
                    time: {type: 'string', format: 'time'},
                    isRecurring: {type: 'boolean'},
                    createdAt: {type: 'string', format: 'date-time'},
                    updatedAt: {type: 'string', format: 'date-time'},
                },
            },
            Booking: {
                type: 'object',
                properties: {
                    id: {type: 'integer'},
                    userId: {type: 'integer'},
                    rideInstanceId: {type: 'integer'},
                    seatsBooked: {type: 'integer'},
                    status: {type: 'string', enum: ['booked', 'cancelled']},
                    createdAt: {type: 'string', format: 'date-time'},
                    updatedAt: {type: 'string', format: 'date-time'},
                },
            },
            Rating: {
                type: 'object',
                properties: {
                    id: {type: 'integer'},
                    userId: {type: 'integer'},
                    rideInstanceId: {type: 'integer'},
                    rating: {type: 'integer', minimum: 1, maximum: 5},
                    comment: {type: 'string'},
                    createdAt: {type: 'string', format: 'date-time'},
                    updatedAt: {type: 'string', format: 'date-time'},
                },
            },
            Notification: {
                type: 'object',
                properties: {
                    id: {type: 'integer'},
                    userId: {type: 'integer'},
                    message: {type: 'string'},
                    read: {type: 'boolean'},
                    createdAt: {type: 'string', format: 'date-time'},
                    updatedAt: {type: 'string', format: 'date-time'},
                },
            },
        },
    },
};

const swaggerUiOptions = {
    routePrefix: '/documentation',
    exposeRoute: true,
};

export default {
    options: swaggerOptions,
    uiOptions: swaggerUiOptions
};
