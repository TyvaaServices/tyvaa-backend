# Tyvaa Backend – Modular Monolith Architecture

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=alert_status&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=bugs&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=code_smells&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=sqale_rating&token=267c4b6405798133f0059b7d78abe552e9949afa)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=sqale_index&token=267c4b6405798133f0059b7d78abe552e9949afa)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)

[//]: # ([![Security Rating]&#40;https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=security_rating&token=267c4b6405798133f0059b7d78abe552e9949afa&#41;]&#40;https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend&#41;)
[//]: # ([![Vulnerabilities]&#40;https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=vulnerabilities&token=267c4b6405798133f0059b7d78abe552e9949afa&#41;]&#40;https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend&#41;)
## Overview
This repository contains the backend for **Tyvaa**, a ridesharing platform for Senegal. The backend is implemented as a modular monolith using **Fastify** (Node.js), with each domain (user, booking, ride, chatbot, notification, etc.) organized as a separate module under a unified codebase. This approach provides clear separation of concerns and scalability, while simplifying deployment and local development compared to a distributed microservices setup.

---

## Architecture
- **Framework:** [Fastify](https://www.fastify.io/) for high-performance HTTP APIs.
- **Modular Structure:**
  - Each domain (user, booking, ride, chatbot, notification, payment, etc.) is a module under `src/modules/`.
  - Each module contains its own routes, controllers, models, and services.
  - All modules are registered to a single Fastify instance at startup.
- **Configuration:**
  - Environment variables managed via `.env` and [dotenv](https://www.npmjs.com/package/dotenv).
  - Centralized config in `src/config/` (DB, Swagger, etc.).
- **Database:** Managed via `src/config/db.js` (details depend on your DB setup).
- **Authentication:** JWT-based, with middleware in `src/middleware/` and `src/plugins/`.
- **Logging:** Centralized logging via `src/utils/logger.js`.
- **Docker Support:** Dockerfile and docker-compose.yaml for containerized development and deployment.

---

## Project Structure
```
src/
  app.js            # Fastify app setup
  server.js         # Entry point, registers all modules
  config/           # DB, Swagger, and other configs
  middleware/       # Auth and other middlewares
  modules/
    user-module/
      routes/       # Route definitions
      controllers/  # Request handlers
      models/       # Data models
      services/     # Business logic
      ...           # Module-specific utils/uploads
    booking-module/
    ride-module/
    chatbot-module/
    notification-module/
    payment-module/
    ...
  utils/            # Shared utilities (JWT, logger, mailer)
plugins/            # Fastify plugins (e.g., JWT)
```

---

## How It Works
- **Startup:**
  - `src/app.js` is the main entry point. It loads environment variables, sets up Fastify, and registers each module's routes under a versioned API prefix (e.g., `/api/v1`).
  - Each module exposes its own router, which is registered with Fastify.
- **Routing:**
  - All API endpoints are grouped by module and versioned (e.g., `/api/v1/user/...`, `/api/v1/booking/...`).
- **Extensibility:**
  - New modules can be added under `src/modules/` with their own routes/controllers/models/services.

---

## Getting Started
### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Docker (optional, for containerized setup)

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
# or with Docker
docker-compose up --build
```

### Environment Variables
Create a `.env` file in the root directory. Example:
```
PORT=3000
DB_HOST=localhost
DB_USER=youruser
DB_PASS=yourpass
JWT_SECRET=your_jwt_secret
```

### Testing
```bash
npm test
```

---

## Key Technologies
- **Fastify** – Web framework
- **dotenv** – Environment variable management
- **JWT** – Authentication
- **Docker** – Containerization
- **Jest** – Testing

---

## Contributing
- Follow the modular structure for new features.
- Write tests for new modules and endpoints.
- Use environment variables for secrets/configuration.

---

## License
See [LICENSE](./LICENSE).
