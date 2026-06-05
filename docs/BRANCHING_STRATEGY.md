# Branching Strategy

## Branches
- `main`: production branch (protected, release-only)
- `staging`: pre-production integration branch (protected)

## Branch naming conventions
- `feat/<ticket>-<short-name>`
- `fix/<ticket>-<short-name>`
- `chore/<ticket>-<short-name>`

Example: `feat/42-developer-profile-upload`

## PR flow
1. Create feature branch from `staging`.
2. Open PR into `staging`.
3. Require CI checks + at least one reviewer approval.
4. Squash merge into `staging`.
5. Periodically open release PR from `staging` -> `main`.
6. Tag release on `main` (`v0.1.0`, `v0.2.0`, ...).

## Protection rules (GitHub)

Apply to both `main` and `staging`:
- Require pull request before merging
- Require approvals: minimum 1 (or 2 when team grows)
- Dismiss stale approvals when new commits are pushed
- Require status checks to pass before merging
- Require conversation resolution before merging
- Block force pushes
- Block branch deletion

Additional for `main`:
- Restrict who can push/merge (maintainers only)
- Require signed commits (optional but recommended)
