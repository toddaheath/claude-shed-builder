# Deployment Guide

## Docker Compose (Local / Staging)

Docker Compose is the simplest way to run the full stack. It starts the API, UI, and PostgreSQL together.

### Prerequisites

- Docker and Docker Compose installed

### Running

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up --build -d
```

Services will be available at:

| Service | URL |
|---------|-----|
| UI | http://localhost:3000 |
| API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

### Configuration

Environment variables are set in `docker-compose.yml`. For staging deployments on a VM, override them with a `.env` file or `docker-compose.override.yml`:

```yaml
# docker-compose.override.yml
services:
  api:
    environment:
      ASPNETCORE_ENVIRONMENT: Staging
      ConnectionStrings__DefaultConnection: "Host=postgres;Database=shedbuilder;Username=shedbuilder;Password=<strong-password>"
  postgres:
    environment:
      POSTGRES_PASSWORD: <strong-password>
```

### Stopping

```bash
docker-compose down        # Stop and remove containers
docker-compose down -v     # Also remove the database volume
```

## Kubernetes with Helm (Production)

The project includes a Helm chart at `deploy/helm/shed-builder/` for Kubernetes deployment.

### Prerequisites

- Kubernetes cluster (1.24+)
- Helm 3 installed
- `kubectl` configured for your cluster
- Docker images pushed to a container registry

### Building and Pushing Images

```bash
# Build images
docker build -f Dockerfile.api -t ghcr.io/<org>/shed-builder-api:1.0.0 .
docker build -f Dockerfile.ui -t ghcr.io/<org>/shed-builder-ui:1.0.0 .

# Push to GitHub Container Registry
docker push ghcr.io/<org>/shed-builder-api:1.0.0
docker push ghcr.io/<org>/shed-builder-ui:1.0.0
```

### Installing the Chart

```bash
# Validate templates first
helm template shed-builder deploy/helm/shed-builder

# Install to staging namespace
helm upgrade --install shed-builder deploy/helm/shed-builder \
  --namespace staging --create-namespace \
  --set api.image.repository=ghcr.io/<org>/shed-builder-api \
  --set api.image.tag=1.0.0 \
  --set ui.image.repository=ghcr.io/<org>/shed-builder-ui \
  --set ui.image.tag=1.0.0 \
  --set postgres.password=<strong-password>

# Install to production namespace
helm upgrade --install shed-builder deploy/helm/shed-builder \
  --namespace production --create-namespace \
  --values deploy/helm/shed-builder/values-production.yaml \
  --set api.image.tag=1.0.0 \
  --set ui.image.tag=1.0.0
```

### Helm Values

Key values in `values.yaml`:

| Value | Default | Description |
|-------|---------|-------------|
| `api.image.repository` | `shed-builder-api` | API Docker image |
| `api.image.tag` | `latest` | API image tag |
| `api.replicas` | `1` | API pod replicas |
| `ui.image.repository` | `shed-builder-ui` | UI Docker image |
| `ui.image.tag` | `latest` | UI image tag |
| `ui.replicas` | `1` | UI pod replicas |
| `postgres.database` | `shedbuilder` | Database name |
| `postgres.password` | `shedbuilder_dev` | Database password (override in production) |
| `postgres.storage.size` | `1Gi` | PVC storage size |
| `ingress.enabled` | `false` | Enable ingress resource |
| `ingress.host` | `shed-builder.local` | Ingress hostname |

### Enabling Ingress

To expose the application via an ingress controller:

```bash
helm upgrade --install shed-builder deploy/helm/shed-builder \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.host=shed-builder.example.com
```

### Rollbacks

Helm tracks release history, making rollbacks straightforward:

```bash
# View release history
helm history shed-builder -n production

# Rollback to previous release
helm rollback shed-builder -n production

# Rollback to a specific revision
helm rollback shed-builder 3 -n production
```

## CI/CD Pipeline

The project includes GitHub Actions workflows for automated builds, security scanning, releases, and deployments. See `.github/workflows/` for details.

### Release Process

1. Tag a release: `git tag v1.0.0 && git push origin v1.0.0`
2. The release workflow builds and pushes Docker images to `ghcr.io`.
3. The deploy workflow can be triggered manually or runs automatically after a release.
4. Staging deploys automatically; production requires approval via GitHub Environments.

## Production Considerations

- **Database passwords:** Never use default passwords. Use Kubernetes secrets or an external secrets manager.
- **Persistent storage:** Configure an appropriate `storageClass` for the PostgreSQL PVC.
- **TLS:** Enable TLS on the ingress with cert-manager or a cloud load balancer.
- **Backups:** Set up regular PostgreSQL backups (pg_dump or a Kubernetes backup operator).
- **Monitoring:** Add health check endpoints and integrate with your monitoring stack.
