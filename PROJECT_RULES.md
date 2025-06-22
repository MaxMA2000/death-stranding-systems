# Project Development Rules & Guidelines

This document outlines the development standards, conventions, and best practices to be followed for the Death Stranding Systems project. Adhering to these rules will ensure code quality, consistency, and collaboration efficiency.

## General Principles

### 1. Language
All code, comments, documentation, and commit messages **MUST** be written in English.

### 2. Branching Strategy
We use a feature-branching workflow.
*   `main`: Contains stable, production-ready code. Direct pushes are forbidden.
*   `develop`: Integration branch for features. This is the primary development branch.
*   **Feature Branches:** All new work (features, fixes, chores) **MUST** be done in a separate branch.
    *   Branch names should be descriptive and prefixed with `feature/`, `fix/`, `docs/`, `chore/`, etc.
    *   Example: `feature/user-authentication`, `fix/map-rendering-bug`.
*   Pull Requests (PRs) should be used to merge feature branches into `develop`.

### 3. Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This helps in automating changelogs and makes the project history more readable.
*   **Format:** `<type>[optional scope]: <description>`
*   **Common Types:**
    *   `feat`: A new feature.
    *   `fix`: A bug fix.
    *   `docs`: Documentation only changes.
    *   `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc).
    *   `refactor`: A code change that neither fixes a bug nor adds a feature.
    *   `perf`: A code change that improves performance.
    *   `test`: Adding missing tests or correcting existing tests.
    *   `build`: Changes that affect the build system or external dependencies.
    *   `ci`: Changes to our CI configuration files and scripts.
    *   `chore`: Other changes that don't modify src or test files.

**Example:**
```
feat(api): add endpoint for placing new orders
```

---

## Backend (Go)

### 1. Project Structure
Follow the standard Go project layout.
```
/cmd          # Main application entrypoints
/internal     # Private application and library code
/pkg          # Public library code (if any)
/api          # OpenAPI/Swagger specs, Protobuf definitions
```

### 2. Code Style
*   All code **MUST** be formatted with `gofmt`.
*   Use a linter like `golangci-lint` to maintain code quality.

### 3. API Design
*   We will use a RESTful API for client-server communication.
*   API endpoints should be documented using the OpenAPI v3 specification. The spec file should live in `/api`.

### 4. Testing
*   Write unit tests for business logic (e.g., pathfinding algorithm, order dispatching).
*   Write integration tests for API endpoints.

---

## Frontend (Next.js)

### 1. Project Creation
*   **ALWAYS** use `npx create-next-app@latest` to create new Next.js projects.
*   Use TypeScript and Tailwind CSS when prompted during project creation.

### 2. Project Structure
*   Use the Next.js App Router.
*   Organize components, hooks, and utilities into logical folders within the `app/` directory.
    *   `app/components/`: Reusable UI components.
    *   `app/lib/`: Utility functions, hooks.
    *   `app/services/`: API client/service layer.

### 3. Code Style & Formatting
*   Use [Prettier](https://prettier.io/) for consistent code formatting.
*   Use [ESLint](https://eslint.org/) to enforce code quality rules. A configuration file will be provided.

### 4. State Management
*   For simple state, use React's built-in hooks (`useState`, `useContext`).
*   For complex, shared state, use [Zustand](https://github.com/pmndrs/zustand). It's lightweight and simple.

### 5. Styling
*   We will use [Tailwind CSS](https://tailwindcss.com/) for utility-first styling. It allows for rapid development and maintains consistency.

### 6. Component Design
*   Break down UI into small, reusable components.
*   Follow a logical component hierarchy.
```
# Example
/components
  /ui       # Generic, reusable UI elements (Button, Input, Card)
  /feature  # Components specific to a feature (OrderForm, MapView)
``` 