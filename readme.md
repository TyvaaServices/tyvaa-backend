# Tyvaa Microservices Project

This repository contains the microservices architecture for **Tyvaa**, a ridesharing platform designed to connect
drivers and passengers in Senegal. The project is built using **Fastify**, a high-performance web framework for Node.js,
and includes multiple services such as a **Gateway Service** and a **Chatbot Service**.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Services](#services)
    - [Gateway Service](#gateway-service)
    - [Chatbot Service](#chatbot-service)
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

## Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Docker** (optional, for containerized deployment)

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/traorecheikh/tyvaa-microservices.git
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
   ```

---

## Usage

### Running Locally

0. Start all **Services**:
    ```bash
    turbo run dev
    ```
1. Start the **Gateway Service**:
   ```bash
   cd services/gateway-service
   npm run dev
   ```

2. Start the **Chatbot Service**:
   ```bash
   cd services/chatbot-service
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
```

---

## Docker Support

### Build and Run

1. Build the Docker image for a service:
   ```bash
   docker build -t gateway-service ./services/gateway-service
   docker build -t chatbot-service ./services/chatbot-service
   ```

2. Run the containers:
   ```bash
   docker run -p 2000:2000 gateway-service
   docker run -p 2001:2001 chatbot-service
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
