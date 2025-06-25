# AGENT.md

## Purpose

This file provides guidance for Jule (or any developer/agent) assisting with this project. It outlines best practices, conventions, and important notes to ensure smooth collaboration and maintenance.

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

## Contact

If you need help, contact the project owner or check the README.md for more information.

---

_Last updated: 2025-06-25_
