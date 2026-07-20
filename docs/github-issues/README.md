# GitHub Issue Generation Pack

This folder contains scripts to create roadmap issues from `docs/SPRINT_BACKLOG.json`.

## Prerequisites
- GitHub CLI installed (`gh`)
- Authenticated to your repo (`gh auth login`)
- Run from repository root

## What it creates
- One issue per task in `docs/SPRINT_BACKLOG.json` (22 issues)
- Standard labels:
  - `roadmap`
  - `sprint:<S0-S6>`
  - `priority:<P0|P1>`
  - `owner:<backend|frontend|product|ops|admin>`
  - `workstream:<...>`

## Dry run
```powershell
./docs/github-issues/create-issues.ps1 -DryRun
```

## Create issues
```powershell
./docs/github-issues/create-issues.ps1
```

## Notes
- The script checks for duplicate title prefixes (`[FAC-XXX]`) and skips existing issues.
- Dependencies are included in issue body as task IDs from the backlog.
- After creation, you can map dependencies to actual issue links manually or with a follow-up automation.
