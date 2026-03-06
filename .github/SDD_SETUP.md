# GitHub Settings Checklist for SDD

Apply these settings in repository `Settings`.

## 1) Create labels for SDD status

Path: `Issues -> Labels -> New label`

Create:
- `spec-draft`
- `spec-approved`
- `impl-in-progress`
- `ready-for-review`
- `done`

## 2) Ruleset for `main`

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
  - `Test`
  - `Build`
- Block force pushes
- Block deletions

## 3) Pull Request settings

Path: `Settings -> General -> Pull Requests`

Enable:
- Always suggest updating pull request branches
- Allow auto-merge (optional)
- Enable merge queue (recommended)

## 4) Merge queue final step

After enabling merge queue, ensure workflow supports it:
- CI workflow already includes `merge_group` trigger.
- Add required checks in ruleset exactly by these names:
  - `Spec Check`
  - `Lint`
  - `Typecheck`
  - `Test`
  - `Build`

## 5) Security baseline

Path: `Settings -> Security -> Code security and analysis`

Enable:
- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Code scanning (default setup for CodeQL)

## 6) Actions hardening

Path: `Settings -> Actions -> General`

Set:
- Actions permissions: allow selected actions and reusable workflows
- Workflow permissions: `Read repository contents and packages` by default

Note: CI workflow already requests minimal token permissions.

## 7) Branch discipline

Team rule:
- No direct commits to `main`
- Work only via feature branches + PR + required checks

## 8) Fast click-by-click order (5-10 minutes)

1. `Settings -> Rules -> Rulesets -> New branch ruleset`
2. Target `main`, enable PR requirement, approvals, conversations resolved, required checks, block force-push/delete
3. In required checks add: `Spec Check`, `Lint`, `Typecheck`, `Test`, `Build`
4. `Settings -> General -> Pull Requests` enable merge queue
5. `Settings -> Security -> Code security and analysis` enable Dependabot + CodeQL
6. `Settings -> Actions -> General` enforce minimal permissions
