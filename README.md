# Find a Client

A two-sided platform where developers showcase demos/projects and clients can discover talent, chat, and hire.

## High-level vision
- Developers can publish projects, demos, and profiles.
- Clients can browse/filter developers and initiate direct messages.
- Hiring workflows can evolve from direct messaging into project contracts.

## Repository model (single repo / monorepo)
- `main` = production branch (only stable, release-ready code)
- `staging` = integration branch (pre-production validation)
- feature branches = daily work (`feat/*`, `fix/*`, `chore/*`)

Detailed strategy is in `docs/BRANCHING_STRATEGY.md`.

## Suggested folder layout
```
.
|-- frontend/
|   |-- src/
|   `-- README.md
|-- backend/
|   |-- src/
|   `-- README.md
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- BRANCHING_STRATEGY.md
|   `-- GITHUB_SETUP.md
`-- .github/
    |-- workflows/
    |-- ISSUE_TEMPLATE/
    `-- PULL_REQUEST_TEMPLATE.md
```

## Team workflow in one minute
1. Branch from `staging` for every task.
2. Open PR into `staging` with tests passing.
3. Validate on staging environment.
4. Merge `staging` into `main` for release.

## Next implementation step
Pick your stack and scaffold apps:
- Frontend: React/Next.js/Vue/Svelte
- Backend: Node.js/NestJS/Express/FastAPI/.NET
