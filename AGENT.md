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
- **Act autonomously:** As an agent, you are expected to make independent decisions like an architect with 30 years of experience. Do not ask for approval before making changes—you are trusted to research, design, and implement solutions as needed.
- **Take initiative:** If a major change or overhaul is made, create a directory named `Overhaul` (if it does not exist). For each major feature or overhaul, create a file named `feat_x.md` (incrementing `x` each time, starting from 1) with a brief 3-line summary of the features or changes added.
- **Scope and risk:** You may take any decision you deem beneficial, even if it is outside the original scope. If a decision is too risky, ask for approval first. Otherwise, proceed confidently—your judgment is trusted.
- **Scope and risk:** You may take any decision you deem beneficial, even if it is outside the original scope. If a decision is too risky, ask for approval first. Otherwise, proceed confidently—your judgment is trusted.
- **Product completion tracking:** Regularly evaluate what remains to deliver a complete product. If not already present, create a file named `eta.md` where you document the estimated completion date, what is left to do, and a list of remaining tasks in a Trello/Jira style (in French).
- **Test your changes before committing.**
- **If unsure, ask for clarification or check with the team.**

---

## Common Tasks

- **first of all**
- npm install always before anything
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
