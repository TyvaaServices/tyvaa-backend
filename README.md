# Tyvaa Backend – Modular Monolith Architecture

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=alert_status&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=coverage&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=bugs&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=code_smells&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=sqale_index&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=sqale_rating&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=reliability_rating&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=TyvaaServices_tyvaa-backend&metric=security_rating&token=20e96f50fb626ffe0d4642e94c92d998de83b4a8)](https://sonarcloud.io/summary/new_code?id=TyvaaServices_tyvaa-backend)

---
## Table of Contents
- [Overview](#overview)
- [Architectural Philosophy & Design](#architectural-philosophy--design)
- [Visual Architecture](#visual-architecture)
- [Project Structure](#project-structure)
- [Deployment & CI/CD](#deployment--cicd)
- [How It Works](#how-it-works)
- [API Documentation](#api-documentation)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Environment Variables](#environment-variables)
  - [Testing](#testing)
- [Key Technologies](#key-technologies)
- [Contributing](#contributing)
- [Security Considerations](#security-considerations)
- [Roadmap / Future Enhancements](#roadmap--future-enhancements)
- [License](#license)
---

## Overview

**Tyvaa** is a modern, reliable, and scalable backend system designed to power a cutting-edge ridesharing platform tailored for the unique transportation landscape of Senegal. Our mission is to provide a seamless and efficient experience for both riders and drivers through robust technology and a well-architected system.

This repository houses the complete backend infrastructure, built as a **modular monolith** using **Fastify** (Node.js). This architectural choice allows for:
-   **Clear Separation of Concerns:** Each core domain (e.g., user management, booking, ride lifecycle, real-time chat, notifications) is encapsulated within its own dedicated module.
-   **Simplified Development & Deployment:** Enjoy the cohesiveness of a single codebase for easier local development, testing, and deployment, especially crucial for agile iterations and a growing team.
-   **Scalability & Maintainability:** While monolithic, the modular design ensures that individual components can be scaled or refactored with minimal impact on other parts of the system, laying a strong foundation for future growth.

Whether you're looking to understand the system architecture, contribute to its development, or deploy your own instance, this document serves as your comprehensive guide.

---

## Architectural Philosophy & Design

The Tyvaa backend is architected as a **Modular Monolith**. This strategic choice offers a balance between the simplicity of a single deployable unit and the organizational benefits of microservices.

**Core Principles:**
-   **Domain-Driven Design (DDD) Influence:** Each business capability (User Management, Ride Booking, Payments, etc.) is encapsulated within a distinct module in `src/modules/`. This promotes separation of concerns and allows teams to develop and maintain their respective domains with a degree of autonomy.
-   **High Cohesion, Low Coupling:** Modules are designed to be internally cohesive, focusing on a specific domain. Interactions between modules occur through well-defined interfaces or events, minimizing direct dependencies.
-   **Scalability with Simplicity:** While a monolith, the system is built with Fastify for high performance. It can be scaled vertically (more powerful servers) or horizontally (multiple instances behind a load balancer). The modular structure also paves the way for future extraction of specific modules into separate microservices if and when the need arises, without a complete rewrite.
-   **Operational Efficiency:** A single codebase simplifies local development, debugging, end-to-end testing, and deployment, especially beneficial for lean teams and rapid iteration cycles.

**Key Architectural Components:**
-   **Framework:** [Fastify](https://www.fastify.io/) - Chosen for its exceptional performance, low overhead, and extensive plugin ecosystem, making it ideal for building robust and fast APIs.
-   **Modular Structure:**
    -   Each primary domain (e.g., `user-module`, `booking-module`, `ride-module`) resides in its own directory under `src/modules/`.
    -   Modules typically contain their own routes, controllers, services (business logic), models (data representation), and any specific validations or utilities.
    -   All modules are dynamically loaded and registered with the main Fastify application instance at startup (`src/app.js`).
-   **Centralized Configuration:** Shared configurations (database connections, Swagger UI, third-party API keys) are managed in `src/config/`, primarily driven by environment variables (using [dotenv](https://www.npmjs.com/package/dotenv)).
-   **Database:** Database interactions are abstracted, typically configured in `src/config/db.js`. The project uses an ORM (details can be inferred from `package.json` if needed, e.g., Sequelize or Prisma) for data persistence.
-   **Authentication & Authorization:** Secured using JSON Web Tokens (JWT), with supporting middleware and Fastify plugins.
-   **Logging:** A centralized logging mechanism (`src/utils/logger.js`) is in place for consistent application monitoring and debugging.
-   **Containerization:** Full Docker support (`Dockerfile`, `docker-compose.yaml`) ensures consistent development, testing, and production environments.

This architectural approach provides a solid foundation for building a reliable and maintainable ridesharing platform, capable of evolving with the project's needs.

---

## Visual Architecture

To provide a clearer understanding of the system's design and deployment, the following diagrams are available in PlantUML format within the repository:

1.  **Class Diagram (`class.diagram`):** Illustrates the core entities, their attributes, and relationships within the application. This provides a detailed view of the data model.
    ```plantuml
    @startuml
    !include class.diagram
    @enduml
    ```
    *To view or generate an image (e.g., PNG) from this diagram, you can use a local PlantUML installation, an online PlantUML editor/server (like the official PlantUML Web Server), or IDE plugins.*

2.  **Deployment Diagram (`deploy.diagram`):** Outlines the deployment architecture, showcasing how the Tyvaa backend interacts with various services like Koyeb, Neon PostgreSQL, Upstash Redis, and other third-party integrations.
    ```plantuml
    @startuml
    !include deploy.diagram
    @enduml
    ```
    *Similar to the class diagram, this can be rendered using PlantUML tools.*

We recommend rendering these diagrams to PNG or SVG format for easier viewing if your Markdown viewer does not support PlantUML rendering directly.

*(Suggestion: For direct embedding in Markdown, consider converting these to PNG/SVG images and committing them to a `docs/images` folder, then linking them using `![Class Diagram](docs/images/class_diagram.png)`)*

---

## Project Structure
```
.
├── .github/              # GitHub Actions workflows (CI/CD)
├── Dockerfile            # Docker image definition
├── docker-compose.yaml   # Docker Compose for local orchestration
├── infra/                # Infrastructure as Code (Terraform)
├── jest.config.mjs       # Jest test runner configuration
├── package.json          # Node.js project manifest
├── readme.md             # This file
├── seeder/               # Database seeding scripts
├── src/                  # Main application source code
│   ├── app.js            # Fastify application setup, plugin registration
│   ├── config/           # Application-wide configurations (DB, Swagger, etc.)
│   ├── modules/          # Core feature modules
│   │   ├── user-module/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── ...       # Other module-specific files
│   │   ├── booking-module/
│   │   ├── ride-module/
│   │   └── ...           # Other feature modules
│   └── utils/            # Shared utility functions (logger, mailer, JWT helpers)
├── tests/                # Automated tests (unit, integration)
└── ...                   # Other configuration files (.gitignore, sonar-project.properties, etc.)
```

*Note: `server.js` from the original structure appears to be integrated into or replaced by `src/app.js` as the main Fastify setup point. Module-specific servers (e.g., `src/modules/audit-module/server.js`) handle module-level concerns.*

---

## Deployment & CI/CD

The application is designed for containerized deployments using Docker, ensuring consistency across development, testing, and production environments.

-   **Docker:**
    -   A `Dockerfile` is provided at the root of the project to build the application image.
    -   `docker-compose.yaml` is available for orchestrating multi-container setups locally (e.g., application, database, caching services).
-   **Deployment Target:** The `deploy.diagram` indicates deployment to the [Koyeb](https://www.koyeb.com/) platform, leveraging its serverless infrastructure for hosting the backend application.
-   **CI/CD:**
    -   Continuous Integration and Continuous Deployment are managed via GitHub Actions.
    -   The workflow configuration can be found in `.github/workflows/deploy.yml`. This pipeline likely handles automated testing, building the Docker image, and deploying to the hosting platform (Koyeb) upon pushes/merges to specific branches.

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

## API Documentation

Comprehensive API documentation is crucial for developers interacting with the backend. This project utilizes Swagger for generating interactive API documentation.

-   **Swagger UI:**
    -   The Swagger specification is configured in `src/config/swagger.js`.
    -   Once the application is running, the API documentation can typically be accessed via a `/documentation` (or similar, e.g. `/docs`, `/api-docs`) endpoint in your browser. (Please verify the exact endpoint from `src/config/swagger.js` or the application setup in `src/app.js`).
    -   This interface allows developers to explore API endpoints, view request/response schemas, and even test the APIs directly.

It is recommended to keep the Swagger documentation up-to-date as new endpoints are added or existing ones are modified.

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

## Security Considerations

Security is a critical aspect of the Tyvaa platform. The following are some of the security measures and best practices implemented or to be mindful of:

-   **Authentication:**
    -   User authentication is handled using JSON Web Tokens (JWT). Ensure JWT secrets are strong and managed securely via environment variables.
    -   Implement appropriate token expiration and revocation strategies.
-   **Input Validation:**
    -   All incoming data from clients (API requests) should be rigorously validated to prevent common web vulnerabilities (e.g., XSS, SQL Injection, NoSQL Injection). Modules should incorporate validation logic for their respective DTOs or request payloads.
-   **Environment Variables:**
    -   Sensitive information such as API keys, database credentials, and JWT secrets must be stored in environment variables (`.env` file for local development, platform-level secrets for production) and never hardcoded into the codebase. The `.gitignore` file should prevent `.env` files from being committed.
-   **HTTPS:**
    -   Ensure that all communication between clients and the backend, and between the backend and external services, uses HTTPS to encrypt data in transit. Deployment platforms like Koyeb typically handle SSL termination.
-   **Rate Limiting & Brute Force Protection:**
    -   Consider implementing rate limiting on sensitive endpoints (e.g., login, OTP generation) to protect against brute-force attacks. Fastify plugins are available for this.
-   **Dependency Management:**
    -   Regularly update dependencies to patch known vulnerabilities. Use tools like `npm audit` or GitHub's Dependabot.
-   **Logging & Monitoring:**
    -   Comprehensive logging (as configured via `src/utils/logger.js`) helps in identifying and investigating security incidents.
-   **Principle of Least Privilege:**
    -   Ensure that different components of the system (e.g., database users, API clients) only have the permissions necessary to perform their intended functions.

This is not an exhaustive list, and security should be an ongoing concern throughout the development lifecycle.

---

## Roadmap / Future Enhancements

While the current system provides a robust foundation, the following are areas for potential future development and enhancement:

-   **Advanced Analytics:** Integration of more sophisticated analytics for ride patterns, demand forecasting, and operational efficiency.
-   **Payment Gateway Diversification:** Adding more local payment options relevant to the Senegalese market.
-   **Real-time Geofencing:** Implementing geofencing for dynamic pricing zones or operational boundaries.
-   **Module Extraction:** As the system scales, selectively extracting mature and high-load modules into independent microservices.
-   **Enhanced Chatbot Capabilities:** Leveraging more advanced AI for customer support and in-app assistance.
-   **Driver Onboarding Improvements:** Streamlining the driver application and verification process.

Contributions and suggestions in these areas, or others that align with the project's goals, are welcome.

---

## License
See [LICENSE](./LICENSE).
