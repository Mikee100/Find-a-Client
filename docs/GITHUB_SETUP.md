# GitHub Setup Checklist

## 1) Create remote repository
- Create repo on GitHub (private recommended at start)
- Add both collaborators with appropriate permissions

## 2) Push local branches
From your local repository:
```bash
git remote add origin <your-repo-url>
git push -u origin main
git push -u origin staging
```

## 3) Configure protected branches
In GitHub repository settings:
- Branch protection rule for `main`
- Branch protection rule for `staging`

Follow the policy in `docs/BRANCHING_STRATEGY.md`.

## 4) Required checks
Set these workflow checks as required:
- Frontend CI
- Backend CI

## 5) Environments
Create environments:
- `staging`
- `production`

Add secrets per environment (database URL, API keys, tokens).

## 6) CODEOWNERS
Update `.github/CODEOWNERS` with real GitHub usernames.

## 7) Optional hardening
- Enable Dependabot alerts
- Enable secret scanning
- Enable code scanning (CodeQL)
