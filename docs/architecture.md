# Architecture

## Overview

Shed Builder is a full-stack application for designing custom sheds with 3D visualization, bill of materials calculation, and STL export for 3D printing. It uses a .NET 8 API backend, a React/Three.js SPA frontend, and PostgreSQL for persistence.

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  ┌───────────────────────────────────────────────┐  │
│  │         React SPA (Vite + TypeScript)         │  │
│  │  ┌─────────────┐  ┌────────────────────────┐  │  │
│  │  │  MUI Forms   │  │  React Three Fiber     │  │  │
│  │  │  (controls)  │  │  (3D shed preview)     │  │  │
│  │  └──────┬───────┘  └────────────┬───────────┘  │  │
│  │         └──────────┬────────────┘              │  │
│  └────────────────────┼───────────────────────────┘  │
└───────────────────────┼──────────────────────────────┘
                        │ HTTP (JSON)
                        ▼
┌───────────────────────────────────────────────────────┐
│              .NET 8 Web API (Kestrel)                 │
│  ┌─────────────────────────────────────────────────┐  │
│  │             DesignsController                    │  │
│  │   GET/POST/PUT/DELETE /api/designs               │  │
│  │   GET /api/designs/{id}/bom                      │  │
│  │   GET /api/designs/{id}/stl                      │  │
│  │   Versioning endpoints                           │  │
│  └──────────┬───────────────┬──────────────────────┘  │
│             │               │                         │
│  ┌──────────▼────┐  ┌──────▼──────────┐              │
│  │ BomCalculator  │  │  StlExporter    │              │
│  │ (materials     │  │  (binary STL    │              │
│  │  estimation)   │  │   generation)   │              │
│  └───────────────┘  └─────────────────┘              │
│             │                                         │
│  ┌──────────▼─────────────────────────────────────┐  │
│  │          EF Core (ShedDbContext)                 │  │
│  └──────────┬──────────────────────────────────────┘  │
└─────────────┼─────────────────────────────────────────┘
              │ TCP/5432
              ▼
┌──────────────────────┐
│   PostgreSQL 16      │
│  ┌────────────────┐  │
│  │ designs         │  │
│  │ design_versions │  │
│  └────────────────┘  │
└──────────────────────┘
```

## Components

### Frontend — `src/shed-builder-ui/`

- **React 18** with TypeScript for type safety.
- **React Three Fiber** renders a 3D preview of the shed based on current dimensions and roof type.
- **MUI (Material UI)** provides form inputs and layout components.
- **Vite** bundles the app and proxies `/api` requests to the backend in development.

### Backend — `src/ShedBuilder.Api/`

- **ASP.NET Core 8 Web API** with a single controller (`DesignsController`) handling all REST endpoints.
- **BomCalculator** computes a bill of materials (lumber, sheathing, hardware) using standard construction formulas (16" OC framing, etc.).
- **StlExporter** generates binary STL files for 3D printing a scale model of the shed.
- **MeasurementHelper** converts between feet/inches pairs and total inches.
- **EF Core 8** with PostgreSQL via Npgsql. Entities use `snake_case` column names. Enums are serialized as strings.

### Database

- **PostgreSQL 16** stores designs and versioned snapshots.
- `designs` table: name, dimensions (width/depth/height as feet+inches pairs), roof pitch, roof type, timestamps.
- `design_versions` table: immutable snapshots linked to a design, with version numbers and labels.

## Data Flow

1. User adjusts shed parameters in the UI (width, depth, height, roof type, pitch).
2. Frontend sends `POST /api/designs` or `PUT /api/designs/{id}` to persist changes.
3. 3D preview updates client-side from the response data.
4. User requests BOM via `GET /api/designs/{id}/bom` — server computes material quantities.
5. User exports STL via `GET /api/designs/{id}/stl` — server generates binary file for download.
6. User can save/restore named versions via the versioning endpoints.

## Tech Stack Rationale

| Choice | Rationale |
|--------|-----------|
| .NET 8 | Long-term support, strong typing, EF Core integration |
| React + Three.js | Rich ecosystem, React Three Fiber simplifies 3D in React |
| PostgreSQL | Reliable, free, well-supported by EF Core/Npgsql |
| Vite | Fast dev server and builds, native TypeScript support |
| Docker Compose | Reproducible local development with all services |
| Helm | Industry-standard Kubernetes deployment, easy rollbacks |

## Deployment Architecture

See [deployment.md](deployment.md) for detailed deployment instructions.

- **Local/Staging:** Docker Compose runs all three services (API, UI, PostgreSQL).
- **Production:** Kubernetes cluster with Helm chart deploying API, UI, and PostgreSQL as separate pods with an optional ingress controller.
