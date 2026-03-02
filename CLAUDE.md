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

# Frontend tests
cd src/shed-builder-ui && npm test

# Docker Compose (full stack)
docker-compose up --build

# Validate Helm templates
helm template deploy/helm/shed-builder
```

## Architecture

- **src/ShedBuilder.Api/**: .NET 8 Web API with EF Core + PostgreSQL
  - Controllers/AuthController.cs: Register, login, and change-password endpoints
  - Controllers/DesignsController.cs: All design REST endpoints (CRUD, BOM, cost, STL, PDF, versions)
  - Services/BomCalculator.cs: Bill of materials calculation (groups openings by actual dimensions)
  - Services/PriceService.cs: Material unit prices for cost estimates
  - Services/PdfExporter.cs: PDF report generation with cost breakdown
  - Services/StlExporter.cs: Binary STL file generation
  - Services/MeasurementHelper.cs: Feet/inches conversions
  - Data/ShedDbContext.cs: EF Core DbContext
- **src/shed-builder-ui/**: React 18 + TypeScript SPA
  - Uses React Three Fiber for 3D shed visualization (doors, windows, shadows)
  - MUI for UI components
  - Vite for bundling (proxies /api to localhost:5000 in dev)
  - Components: ShedViewer3D, DesignPanel, DesignList (with search + duplicate), BomTable, VersionPanel, DimensionInput, ErrorBoundary
  - DimensionInput: Reusable feet/inches input pair with inline validation (used by DesignPanel)
  - DesignList shows opening counts in summary (e.g., "8' × 10' · 1 door, 2 windows")
  - Change password dialog accessible from toolbar (uses api.changePassword)
  - Design duplication via copy button in DesignList sidebar
- **tests/ShedBuilder.Api.Tests/**: xUnit tests (unit + integration)
  - Uses InMemory database for integration tests
- **deploy/helm/shed-builder/**: Helm 3 chart for Kubernetes deployment

## Key Conventions

- Enum serialization uses string format (JsonStringEnumConverter)
- EF Core entities use snake_case column names via [Column] attributes
- API returns JSON with camelCase property names (default)
- RoofType enum: Gable, LeanTo
- Dimensions are stored as feet + inches (int pairs)
- EF Core packages pinned to 8.0.x (Npgsql at 8.0.11, Identity/JwtBearer at 8.0.24)
- Rate limiting on auth endpoints (login: 5/min, register: 3/5min) — disabled in integration tests via `DISABLE_RATE_LIMITING=true` config flag
- Auth endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/change-password` (requires `[Authorize]`)
- Password requirements: min 12 characters, must include a digit and a special character
- Error responses use ProblemDetails format (read `detail` field on the frontend)
- Opening validation: zero dimensions rejected, wall width/height bounds checked, overlap detection on same wall
- ValidateOpenings uses wall width (front/back → widthInches, left/right → depthInches)
