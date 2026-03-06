# GitHub Settings Checklist for SDD

Apply these settings in repository `Settings`.

## 1) Ruleset for `main`

Path: `Settings -> Rules -> Rulesets -> New branch ruleset`

Use:
- Target branches: `main`
- Require a pull request before merging
- Required approvals: `1` (or `2` for stricter flow)
- Dismiss stale approvals on new commits
- Require conversation resolution before merging
- Require status checks to pass before merging
- Required checks:
  - `Spec Check`
  - `Lint`
  - `Typecheck`
  - `Build`
- Block force pushes
- Block deletions

## 2) Pull Request settings

Path: `Settings -> General -> Pull Requests`

Enable:
- Always suggest updating pull request branches
- Allow auto-merge (optional)
- Optionally enable merge queue for team scaling

## 3) Security baseline

Path: `Settings -> Security`

Enable:
- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Code scanning (default setup for CodeQL)

## 4) Actions hardening

Path: `Settings -> Actions -> General`

Set:
- Actions permissions: allow selected actions and reusable workflows
- Workflow permissions: `Read repository contents and packages` by default

Note: CI workflow already requests minimal token permissions.

## 5) Branch discipline

Team rule:
- No direct commits to `main`
- Work only via feature branches + PR + required checks
