# Command History

This file tracks all user commands issued to Claude Code for this project, in chronological order.
Claude Code: When starting a new conversation, read this file to understand what has been done.

---

## Session 1 — 2026-02-06

### Command 1: Implement the full shed builder application
**Prompt summary**: Implement the full plan for a greenfield shed builder application — .NET 8 API + React/Three.js SPA + PostgreSQL, with Docker and Helm deployment. The plan covered 5 phases:
1. Project scaffolding (.gitignore, .NET solution, React/Vite project, xUnit test project, Docker/docker-compose)
2. API core (EF models, DbContext, migrations, MeasurementHelper, BomCalculator, StlExporter, DesignsController, Program.cs)
3. Frontend (TypeScript types, API client, auto-save hook, ShedViewer3D, DesignPanel, BomTable, DesignList, VersionPanel, App layout)
4. Testing — 68 tests across MeasurementHelper, BomCalculator, StlExporter, DesignsController (unit), and full API integration tests
5. Infrastructure — Helm chart (Chart.yaml, values.yaml, templates for postgres/api/ui deployments, services, PVC, ingress), README.md, CLAUDE.md update

**Result**: All 5 phases completed. 68/68 tests passing, 0 build warnings, frontend builds cleanly.

### Command 2: Create command history file, commit and push all changes
**Prompt summary**: Add a readme-style file listing all commands given, recognizable by Claude Code in future contexts. Then commit and push everything to GitHub.

**Result**: Created COMMAND_HISTORY.md (this file), committed and pushed all project files.

---

## Session 2 — 2026-02-20

### Command 1: Configure build and release actions/pipelines similar to claude-optimization-heuristics
**Prompt summary**: Align the GitHub Actions workflows in this repo with the patterns used in `~/Documents/GitHub/claude-optimization-heuristics`. Create a branch and push the changes. Use `shed-builder` as the short name for components when deploying to Azure.

**Result**: Created branch `chore/align-ci-cd-pipelines` with the following changes:
- **ci.yml**: Added `workflow_call` (reusable), concurrency group, NuGet package cache, postgres 16 service container, split unit/integration test runs with TRX result artifacts, bumped Node to 22, added frontend build artifact upload
- **release.yml**: Added `ci` job (reusable workflow call) gating `build-and-push` and `helm-package`; switched to `docker/metadata-action` for semver tagging
- **deploy.yml**: Removed `workflow_run` trigger (replaced by `deploy-prod.yml`); kept `workflow_dispatch` only for manual rollouts
- **deploy-dev.yml** (new): Auto-deploys non-`main` branches to `dev` namespace — CI → GHCR build (`dev-<sha>`) → Helm upgrade
- **deploy-prod.yml** (new): Auto-deploys `main` to `production` — CI → GHCR build (`prod-<sha>` + `:latest`) → Helm upgrade

### Command 2: Create a PR
**Result**: Opened PR #3 — "Align CI/CD pipelines with optimization-heuristics patterns".

### Command 3: Create required GitHub variables and secrets for the Actions
**Result**: Created four GitHub environments (`dev`, `prod`, `staging`, `production`) and populated:
- Secrets `KUBE_CONFIG` and `DB_PASSWORD` in `dev`, `staging`, and `production` environments (value: TBD — must be set manually)
- Variable `PRODUCTION_HOST` in `production` environment (value: TBD — must be set manually)
- `prod` environment requires no custom secrets (only the automatic `GITHUB_TOKEN`)

### Command 4: Merge the PR
**Result**: Merged PR #3 into `main` (merge commit), deleted `chore/align-ci-cd-pipelines` branch.

### Command 5: Switch to main and pull latest
**Result**: Already on `main` and up to date (merge had already updated the local branch).
