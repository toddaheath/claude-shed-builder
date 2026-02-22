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

---

## Session 3 — 2026-02-20

### Command 1: Switch deploy workflows from KUBE_CONFIG to Azure OIDC auth
**Prompt summary**: Stop storing kubeconfig in secrets. Use Azure subscription ID, tenant ID, and client ID to authenticate instead. The dev environment should also use AKS cluster name, resource group, ACR login server, and storage account name.

**Result**: Updated all three deploy workflows (`deploy-dev.yml`, `deploy-prod.yml`, `deploy.yml`):
- Replaced `Set kubeconfig` step (base64-decoded `KUBE_CONFIG` secret) with `azure/login@v2` + `azure/aks-set-context@v3`
- Added `id-token: write` permission to all workflows for OIDC token exchange
- Dev workflow switches container registry from GHCR to ACR (`vars.ACR_LOGIN_SERVER`), uses `vars.ACR_NAME` for `az acr login`, and passes `vars.STORAGE_ACCOUNT_NAME` to Helm
- Fixed `az acr login --name` to use registry name not login server URL

### Command 2: Create a branch, commit, create required secrets/variables in GitHub, create a PR
**Result**:
- Created branch `chore/azure-oidc-auth`, committed changes, opened PR #5
- Set repo-level secrets: `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_ID`
- Dev environment variables (`AKS_CLUSTER_NAME`, `RESOURCE_GROUP`, `ACR_LOGIN_SERVER`, `ACR_NAME`, `STORAGE_ACCOUNT_NAME`) required a fine-grained PAT with Variables + Environments permissions — set after user provided PAT

### Command 3: Merge the PR
**Result**: Merged PR #5 into `main` (fast-forward), deleted `chore/azure-oidc-auth` branch.

### Command 4: Set up federated credentials in Azure
**Result**: Created three federated credentials on app registration `4f9acb18-3bf6-442c-9709-8612d2647a56` using `az ad app federated-credential create`:
- `github-shedbuilder-env-dev` → `repo:toddaheath/claude-shed-builder:environment:dev`
- `github-shedbuilder-env-staging` → `repo:toddaheath/claude-shed-builder:environment:staging`
- `github-shedbuilder-env-production` → `repo:toddaheath/claude-shed-builder:environment:production`

### Command 5: Set GitHub secrets and variables
**Result**: Set repo-level secrets (`AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_ID`) using the keyring OAuth token. Set dev environment variables (`AKS_CLUSTER_NAME`, `RESOURCE_GROUP`, `ACR_LOGIN_SERVER`, `ACR_NAME`, `STORAGE_ACCOUNT_NAME`) using a fine-grained PAT provided by the user (required Variables + Environments read/write permissions).

### Command 6: Fix failing UI lint
**Prompt summary**: Check the UI lint issue and create a PR.

**Result**: Found 4 `react-hooks/refs` errors — `canUndo` and `canRedo` were derived from `ref.current.length` during render in both `useUndoRedo.ts` and `App.tsx`. Fixed by tracking `canUndo`/`canRedo` as state values updated in `push`, `undo`, `redo`, and `reset` callbacks. Removed the `undoRedoVersion` workaround counter from `App.tsx`. Created branch `fix/ui-lint-ref-during-render`, opened PR #6.

### Command 7: Update documentation, commit, merge PR #6
**Result**: No documentation was out of date (`CLAUDE.md` has no references to auth or undo/redo; UI README is default Vite scaffold). Merged PR #6 into `main` (fast-forward), deleted branch.

---

## Session 4 — 2026-02-22

### Command 1: Investigate why the SPA is not getting deployed to dev and prod
**Result**: Diagnosed two distinct issues:

**Dev** — All three pods (api, postgres, ui) were timing out after 5 minutes with `Available: 0/1`. Root cause: AKS kubelet managed identity had no role assignments and could not pull images from ACR. Fixed by running `az aks update --attach-acr acrheathrobotics` on `aks-heathrobotics-dev`.

**Prod** — Deployment failed immediately at `Get AKS credentials` with `Error: Input required and not supplied: resource-group`. Root cause: `production` GitHub environment was missing `RESOURCE_GROUP` and `AKS_CLUSTER_NAME` variables (only `dev` had been populated). Fixed by setting `RESOURCE_GROUP=rg-heathrobotics-prod` and `AKS_CLUSTER_NAME=aks-heathrobotics-prod` in the `production` environment, and granting ACR pull to the prod cluster (`az aks update --attach-acr acrheathrobotics` on `aks-heathrobotics-prod`).

**Staging** — Same missing variables discovered proactively. No staging cluster exists; set `RESOURCE_GROUP=rg-heathrobotics-dev` and `AKS_CLUSTER_NAME=aks-heathrobotics-dev` so staging shares the dev cluster (different namespace).

### Command 2: Update command history
**Result**: Added session 4 entries to COMMAND_HISTORY.md, committed and merged via PR.
