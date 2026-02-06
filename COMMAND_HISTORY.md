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
