# Contributing to Shed Builder

Thank you for your interest in contributing to the Shed Builder project.

## Development Setup

### Prerequisites

- .NET SDK 8.0
- Node.js 18+ (21.x recommended)
- PostgreSQL 16 (or Docker)
- Docker & Docker Compose (for full-stack local development)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/<org>/claude-shed-builder.git
   cd claude-shed-builder
   ```

2. Start PostgreSQL (via Docker Compose or local install):
   ```bash
   docker-compose up -d postgres
   ```

3. Run the API:
   ```bash
   cd src/ShedBuilder.Api
   dotnet run
   ```

4. Run the frontend:
   ```bash
   cd src/shed-builder-ui
   npm install
   npm run dev
   ```

5. Or run everything with Docker Compose:
   ```bash
   docker-compose up --build
   ```

### Running Tests

```bash
dotnet test
dotnet test --collect:"XPlat Code Coverage"
```

## Branch Naming

Use the following prefixes:

- `feature/` — New features (e.g., `feature/add-window-support`)
- `fix/` — Bug fixes (e.g., `fix/bom-rounding-error`)
- `docs/` — Documentation changes
- `chore/` — Maintenance, CI, dependencies

## Pull Request Process

1. Create a branch from `main` using the naming conventions above.
2. Make your changes. Ensure all tests pass locally.
3. Open a PR against `main` with a clear title and description.
4. At least one review approval is required before merging.
5. Squash-merge is preferred for a clean commit history.

## Coding Standards

### Backend (.NET)

- Follow the existing project conventions (see `CLAUDE.md` for details).
- Use `record` types for DTOs, `class` for EF Core entities.
- Pin NuGet package versions explicitly (no floating ranges).
- Enum serialization uses `JsonStringEnumConverter` (string format, not integers).
- EF Core entities use `snake_case` column names via `[Column]` attributes.
- Add xUnit tests for new endpoints and services.

### Frontend (React/TypeScript)

- Use functional components with hooks.
- Use MUI for UI components, React Three Fiber for 3D rendering.
- Run `npm run build` to verify TypeScript compilation before pushing.

## Reporting Issues

Open a GitHub Issue with:

- Steps to reproduce
- Expected vs. actual behavior
- Environment details (OS, .NET SDK version, Node version)
