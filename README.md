# Shed Builder

A full-stack shed design application. Design small sheds (gable or lean-to roof), view them in 3D, calculate bill of materials, auto-save work, version designs, and export STL files.

## Tech Stack

- **API**: .NET 8 ASP.NET Core Web API, Entity Framework Core, PostgreSQL
- **Frontend**: React 18 + TypeScript, React Three Fiber (Three.js), Vite, MUI
- **Testing**: xUnit, Moq, Microsoft.AspNetCore.Mvc.Testing
- **Infrastructure**: Docker, Docker Compose, Helm 3

## Quick Start (Docker Compose)

```bash
docker-compose up --build
```

- **UI**: http://localhost:3000
- **API**: http://localhost:8080
- **Swagger**: http://localhost:8080/swagger

## Local Development

### API

```bash
# Requires .NET 8 SDK and PostgreSQL running on localhost:5432
cd src/ShedBuilder.Api
dotnet run
```

### Frontend

```bash
cd src/shed-builder-ui
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`.

## Running Tests

```bash
dotnet test
```

With coverage:

```bash
dotnet test --collect:"XPlat Code Coverage"
```

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/designs | List all designs |
| GET | /api/designs/{id} | Get single design |
| POST | /api/designs | Create new design |
| PUT | /api/designs/{id} | Update design (auto-save target) |
| DELETE | /api/designs/{id} | Delete design |
| GET | /api/designs/{id}/bom | Get bill of materials |
| GET | /api/designs/{id}/stl | Download STL file |
| GET | /api/designs/{id}/versions | List saved versions |
| POST | /api/designs/{id}/versions | Save a named version |
| GET | /api/designs/{id}/versions/{vid} | Get specific version |
| POST | /api/designs/{id}/versions/{vid}/restore | Restore a version |

## Kubernetes Deployment (Helm)

```bash
helm install shed-builder deploy/helm/shed-builder

# With ingress enabled
helm install shed-builder deploy/helm/shed-builder --set ingress.enabled=true --set ingress.host=shed.example.com
```

Validate templates:

```bash
helm template deploy/helm/shed-builder
```

## Project Structure

```
src/ShedBuilder.Api/       # .NET Web API
src/shed-builder-ui/       # React SPA
tests/ShedBuilder.Api.Tests/  # xUnit tests
deploy/helm/shed-builder/  # Helm chart
```
