# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

claude-shed-builder — a full-stack shed design application with .NET 8 API + React/Three.js SPA + PostgreSQL.

## Build & Run Commands

```bash
# Build the .NET solution
dotnet build ShedBuilder.sln

# Run tests
dotnet test

# Run tests with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run API locally (requires PostgreSQL)
cd src/ShedBuilder.Api && dotnet run

# Frontend dev server
cd src/shed-builder-ui && npm run dev

# Docker Compose (full stack)
docker-compose up --build

# Validate Helm templates
helm template deploy/helm/shed-builder
```

## Architecture

- **src/ShedBuilder.Api/**: .NET 8 Web API with EF Core + PostgreSQL
  - Controllers/DesignsController.cs: All REST endpoints
  - Services/BomCalculator.cs: Bill of materials calculation
  - Services/StlExporter.cs: Binary STL file generation
  - Services/MeasurementHelper.cs: Feet/inches conversions
  - Data/ShedDbContext.cs: EF Core DbContext
- **src/shed-builder-ui/**: React 18 + TypeScript SPA
  - Uses React Three Fiber for 3D shed visualization
  - MUI for UI components
  - Vite for bundling (proxies /api to localhost:5000 in dev)
- **tests/ShedBuilder.Api.Tests/**: xUnit tests (unit + integration)
  - Uses InMemory database for integration tests
- **deploy/helm/shed-builder/**: Helm 3 chart for Kubernetes deployment

## Key Conventions

- Enum serialization uses string format (JsonStringEnumConverter)
- EF Core entities use snake_case column names via [Column] attributes
- API returns JSON with camelCase property names (default)
- RoofType enum: Gable, LeanTo
- Dimensions are stored as feet + inches (int pairs)
- All NuGet packages pinned to 8.0.11 for EF Core compatibility
- Rate limiting on auth endpoints (login: 5/min, register: 3/5min) — disabled in integration tests via `DISABLE_RATE_LIMITING=true` config flag
