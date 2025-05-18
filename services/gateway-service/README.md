# Tyvaa Microservices Project

This repository contains the microservices architecture for **Tyvaa**, a ridesharing platform designed to connect
drivers and passengers in Senegal. The project is built using **Fastify**, a high-performance web framework for Node.js,
and includes multiple services such as a **Gateway Service**, **Chatbot Service**, **Notification Service**, and **User
Service**.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Services](#services)
    - [Gateway Service](#gateway-service)
    - [Chatbot Service](#chatbot-service)
    - [Notification Service](#notification-service)
    - [User Service](#user-service)
    - [Ride Service](#ride-service)
    - [Location Service](#location-service)
    - [Auth Service](#auth-service)
4. [Installation](#installation)
5. [Usage](#usage)
6. [Environment Variables](#environment-variables)
7. [API Documentation](#api-documentation)
8. [Development](#development)
9. [Testing](#testing)
10. [Docker Support](#docker-support)
11. [Contributing](#contributing)
12. [License](#license)

---

## Overview

Tyvaa is a ridesharing platform that connects drivers with passengers. It provides a seamless experience for users to
book rides, manage reservations, and interact with a support chatbot. The platform is built with a microservices
architecture to ensure scalability and maintainability.

---

## Architecture

The project follows a **microservices architecture** with the following key components:

- **Gateway Service**: Acts as the central entry point for all API requests and proxies them to the appropriate
  microservices.
- **Chatbot Service**: Provides a support chatbot for user assistance, powered by AI.
- **Notification Service**: Handles notifications (e.g., SMS, email) for user interactions.
- **User Service**: Manages user data, including authentication and user profiles.

Each service is self-contained and communicates with others via HTTP.

---

## Services

### Gateway Service

The **Gateway Service** is the central API gateway for the Tyvaa platform. It handles routing, authentication, and API
documentation.

#### Features:

- Proxies requests to other microservices.
- Provides Swagger-based API documentation.
- Handles authentication and user management.

#### Key Files:

- `server.js`: Entry point for the service.
- `config/swagger.js`: Configuration for Swagger API documentation.
- `Dockerfile`: Docker configuration for the service.

---

### Chatbot Service

The **Chatbot Service** provides an AI-powered chatbot for user support. It uses **Genkit AI** and integrates with *
*Google Generative AI** for advanced conversational capabilities.

#### Features:

- Responds to user queries with a customizable personality.
- Supports conversation history for context-aware responses.
- Validates input using **Zod** schemas.

#### Key Files:

- `src/ai/ai-instance.js`: Initializes the AI instance.
- `src/ai/flows/support-chat-flow.js`: Defines the chatbot's conversational flow.
- `src/routes/chatbotRoutes.js`: API routes for interacting with the chatbot.

---

### Notification Service

The **Notification Service** handles notifications for the Tyvaa platform, such as sending SMS or email alerts.

#### Features:

- Sends notifications via Firebase.
- Supports dynamic configuration using environment variables.
- Validates notification payloads.

#### Key Files:

- `server.js`: Entry point for the service.
- `routes/notificationRouter.js`: API routes for sending notifications.
- `.env`: Configuration for Firebase and service-specific settings.

---

### User Service

The **User Service** manages user data and authentication for the Tyvaa platform.

#### Features:

- Handles user registration and login.
- Generates OTPs for authentication.
- Manages user profiles and updates.

#### Key Files:

- `server.js`: Entry point for the service.
- `routes/userRouter.js`: API routes for user management.
- `model/user.js`: Sequelize model for user data.
- `config/db.js`: Database configuration.

---

### Ride Service

The **Ride Service** handles ride creation, retrieval, and management for the Tyvaa platform.

#### Features:

- Manages ride creation and updates.
- Retrieves ride details.
- Handles ride-related notifications.

#### Key Files:

- `server.js`: Entry point for the service.
- `controllers/rideController.js`: Business logic for ride management.
- `routes/rideRouter.js`: API routes for ride operations.
- `models/ride.js`: Sequelize model for ride data.

---

### Location Service

The **Location Service** stores and retrieves user location data for real-time features.

#### Features:

- Manages user location data.
- Provides real-time location updates.
- Integrates with mapping services.

#### Key Files:

- `server.js`: Entry point for the service.
- `routes/locationRoutes.js`: API routes for location operations.

---

### Auth Service

The **Auth Service** handles authentication and JWT token management for Tyvaa users.

#### Features:

- Manages user authentication.
- Issues and verifies JWT tokens.
- Provides secure access to protected resources.

#### Key Files:

- `index.js`: Entry point for the service.
- `utils/logger.js`: Logging utility for the service.

---

## Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Docker** (optional, for containerized deployment)

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/traorecheikh/backend-tyvaa.git
   cd backend-tyvaa
   ```

2. Install dependencies for all services:
   ```bash
   npm install
   ```

3. Navigate to each service directory and install its dependencies:
   ```bash
   cd services/gateway-service
   npm install
   cd ../chatbot-service
   npm install
   cd ../notification-service
   npm install
   cd ../user-service
   npm install
   ```

---

## Usage

### Running Locally

1. Start all **Services**:
    ```bash
    turbo run dev
    ```

2. Start individual services if needed:
   ```bash
   cd services/gateway-service
   npm run dev

   cd ../chatbot-service
   npm run dev

   cd ../notification-service
   npm run dev

   cd ../user-service
   npm run dev
   ```

3. Access the Gateway Service at `http://localhost:2000`.

---

## Environment Variables

Each service requires specific environment variables. Create a `.env` file in the root of each service directory.

### Gateway Service

```env
PORT=2000
```

### Chatbot Service

```env
PORT=2001
GOOGLE_API_KEY=your-google-api-key
```

### Notification Service

```env
PORT=2004
FIREBASE_KEY_BASE64=your-firebase-key-base64
```

### User Service

```env
PORT=2003
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_HOST=your-db-host
DB_PORT=your-db-port
DB_NAME=your-db-name
```

---

## API Documentation

The **Gateway Service** provides Swagger-based API documentation. Once the service is running, access the documentation
at:

```
http://localhost:2000/docs
```

---

## Development

### Code Structure

- **Gateway Service**:
    - `config/`: Configuration files (e.g., Swagger).
    - `routes/`: API route definitions.
    - `Dockerfile`: Docker configuration.

- **Chatbot Service**:
    - `src/ai/`: AI-related logic and configurations.
    - `src/routes/`: API route definitions.
    - `Dockerfile`: Docker configuration.

- **Notification Service**:
    - `routes/`: API route definitions.
    - `server.js`: Service entry point.
    - `.env`: Environment variables.

- **User Service**:
    - `routes/`: API route definitions.
    - `model/`: Sequelize models.
    - `config/`: Database configuration.

### Scripts

- `npm start`: Start the service.
- `npm run dev`: Start the service in development mode with **nodemon**.

---

## Testing

### Unit Tests

Run unit tests for each service:

```bash
cd services/gateway-service
npm test

cd ../chatbot-service
npm test

cd ../notification-service
npm test

cd ../user-service
npm test
```

---

## Docker Support

### Build and Run

1. Build the Docker image for a service:
   ```bash
   docker build -t gateway-service ./services/gateway-service
   docker build -t chatbot-service ./services/chatbot-service
   docker build -t notification-service ./services/notification-service
   docker build -t user-service ./services/user-service
   ```

2. Run the containers:
   ```bash
   docker run -p 2000:2000 gateway-service
   docker run -p 2001:2001 chatbot-service
   docker run -p 2004:2004 notification-service
   docker run -p 2003:2003 user-service
   ```

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your message here"
   ```
4. Push to your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a pull request.

---

## License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

