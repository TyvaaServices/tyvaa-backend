# AGENT.md

## Purpose

This file provides guidance for Jule (or any developer/agent) assisting with this project. It outlines best practices,
conventions, and important notes to ensure smooth collaboration and maintenance.

---

## General Guidelines

- **Read the documentation and code comments before making changes.**
- **Preserve JSDoc comments and documentation.**
- **Remove only regular comments if asked, not JSDoc.**
- **Follow the project's code style and formatting.**
- **Test your changes before committing.**
- **If unsure, ask for clarification or check with the team.**

---

## Common Tasks

- **Adding Features:**
    - Break down the feature into small, testable parts.
    - Write or update tests as needed.
- **Fixing Bugs:**
    - Reproduce the bug first.
    - Add a test if possible.
    - Fix the bug and verify the fix.
- **Refactoring:**
    - Ensure no functionality is broken.
    - Run all tests after refactoring.

---

## Communication

- Use clear commit messages.
- Document any non-obvious changes in the code or in this file.
- If you encounter blockers, document them here or in an issue.

---

## Project Structure

- `src/` contains the main application code.
- `tests/` contains unit and integration tests.
- `utils/` contains utility modules (e.g., logger, redisCache).

---

## Onboarding

- Clone the repository and install dependencies with `npm install`.
- Copy `.env.example` to `.env` and fill in required environment variables.
- Run database migrations and seeders as described in the README.
- Run tests with `npm test` to verify your setup.

---

## Deployment

- Use Docker Compose for local development and testing (`docker-compose up`).
- For production, review the `Dockerfile` and `infra/` for infrastructure-as-code and deployment scripts.
- Always check environment variables and secrets before deploying.

---

## Troubleshooting

- Check the `logs/` directory for service-specific logs.
- Use `npm run lint` to check for code style issues.
- If you encounter database errors, verify your migrations and seeders.
- For test failures, check the `coverage/` report and logs for details.

---

## Code Review Checklist

- [ ] Code is well-documented with JSDoc where appropriate.
- [ ] All new features have tests.
- [ ] No secrets or sensitive data are committed.
- [ ] Code follows the project's style guide.
- [ ] All tests pass locally.

---

## Useful Commands

- `npm run dev` — Start the app in development mode with hot reload.
- `npm run lint` — Run ESLint on the codebase.
- `npm test` — Run all tests.
- `npm run seed` — Run database seeders.

---

## Contact

If you need help, contact the project owner or check the README.md for more information.

---

_Last updated: 2025-06-29_
