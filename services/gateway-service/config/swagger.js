const swaggerOptions = {
    swagger: {
        info: {
            title: 'Tyvaa - Passerelle API',
            description: 'Point d’entrée central pour les microservices de l’application Tyvaa',
            version: '1.0.0',
        },
        host: `localhost:${process.env.PORT || 2000}`,
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
            {
                name: 'Auth',
                description: 'Gestion de l’authentification et des utilisateurs (proxied vers le service Auth)'
            },
            {name: 'Rides', description: 'Gestion et recherche des trajets (proxied vers le service Rides)'},
            {name: 'Bookings', description: 'Gestion des réservations (proxied vers le service Bookings)'},
            {name: 'Payments', description: 'Opérations de paiement (proxied vers le service Payments)'},
            {name: 'Chatbot', description: 'Endpoint pour le chatbot de support'},
            {name: 'Gateway', description: 'Endpoints spécifiques à la passerelle'},
        ],
        securityDefinitions: {
            Bearer: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header',
                description: "Entrez 'Bearer {token}' pour accéder aux routes protégées",
            },
        },
        paths: {
            '/health': {
                get: {
                    tags: ['Gateway'],
                    summary: 'Vérification de l’état de santé de la passerelle API',
                    responses: {
                        '200': {
                            description: 'La passerelle est en ligne',
                            schema: {
                                type: 'object',
                                properties: {
                                    status: {type: 'string'},
                                    gateway: {type: 'string'},
                                },
                            },
                        },
                    },
                },
            },
            '/api/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Connexion utilisateur',
                    description: 'Permet à un utilisateur de se connecter en fournissant ses identifiants.',
                    parameters: [
                        {
                            in: 'body',
                            name: 'body',
                            description: 'Identifiants de connexion',
                            required: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    email: {type: 'string', format: 'email'},
                                    password: {type: 'string', format: 'password'},
                                },
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Connexion réussie',
                            schema: {
                                type: 'object',
                                properties: {
                                    token: {type: 'string'},
                                },
                            },
                        },
                        '401': {
                            description: 'Identifiants invalides',
                        },
                    },
                },
            },
            '/api/auth/signup': {
                post: {
                    tags: ['Auth'],
                    summary: 'Inscription utilisateur',
                    description: 'Permet à un utilisateur de créer un compte.',
                    parameters: [
                        {
                            in: 'body',
                            name: 'body',
                            description: 'Informations d’inscription',
                            required: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    name: {type: 'string'},
                                    email: {type: 'string', format: 'email'},
                                    password: {type: 'string', format: 'password'},
                                },
                            },
                        },
                    ],
                    responses: {
                        '201': {
                            description: 'Compte créé avec succès',
                        },
                        '400': {
                            description: 'Erreur de validation des données',
                        },
                    },
                },
            },
            '/api/support/chat': {
                post: {
                    tags: ['Chatbot'],
                    summary: 'Interagir avec le chatbot de support',
                    description: 'Envoyez un message au chatbot pour obtenir de l’aide ou des informations sur l’application Tyvaa.',
                    parameters: [
                        {
                            in: 'body',
                            name: 'body',
                            description: 'Message et personnalité pour le chatbot',
                            required: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    message: {type: 'string', description: 'Message à envoyer au chatbot'},
                                    personality: {
                                        type: 'string',
                                        enum: ['f', 'm'],
                                        description: 'Personnalité du chatbot : "f" pour féminin (Oulyx), "m" pour masculin (Chyx)',
                                    },
                                },
                            },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Réponse réussie du chatbot',
                            schema: {
                                type: 'object',
                                properties: {
                                    reply: {type: 'string', description: 'Réponse du chatbot'},
                                },
                            },
                        },
                        '400': {
                            description: 'Erreur de validation des données',
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {type: 'string'},
                                    message: {type: 'string'},
                                    issues: {type: 'array', items: {type: 'object'}},
                                },
                            },
                        },
                        '500': {
                            description: 'Erreur interne',
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {type: 'string'},
                                },
                            },
                        },
                    },
                },
            },
        },
        definitions: {
            ExternalPlaceholder: {
                type: 'object',
                description: 'Cet endpoint est proxied vers un service en amont. Consultez la documentation du service pour plus de détails.',
                properties: {
                    message: {type: 'string'},
                },
            },
        },
    },
};

const swaggerUiOptions = {
    routePrefix: '/docs',
    exposeRoute: true,
    transformStaticCSPData: (data) => {
        return data;
    },
};

module.exports = {
    options: swaggerOptions,
    uiOptions: swaggerUiOptions,
};
