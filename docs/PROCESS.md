# Delivery Process (Enforced)

Last updated: 2026-03-09

This file is the operational contract for all implementation work.

## 1. Scope Anchor

Every implementation must be anchored to:

1. one roadmap item (`docs/ROADMAP.md`),
2. one spec package (`specs/<feature>/spec.md`, `plan.md`, `tasks.md`),
3. one Linear issue in status `In Progress`.

No anchor -> no coding.

## 2. Mandatory Execution Flow

1. **Pick task**
- Pick exactly one active task from `tasks.md`.
- Link it to one Linear issue.

2. **Create branch**
- Branch format: `codex/<linear-id-or-spec>-<short-topic>`.
- Direct implementation on `main` is not allowed.

3. **Implement**
- Keep scope limited to selected task.
- Run local quality gate before PR:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

4. **Open PR**
- Fill `.github/pull_request_template.md` fully.
- Required: `Spec Link`, scope, acceptance checklist, test evidence.
- PR must be opened via compare URL with prefilled `title` and `body` parameters.
- For each PR, keep a draft file in spec folder:
  - `specs/<feature>/pr-<short-topic>.md` (source of truth for Title/Body).

5. **Update Linear**
- Populate:
  - Acceptance Criteria
  - Test Evidence
  - Definition of Done
- Move issue to `Done` only after PR merge.

6. **Merge + aftercare**
- Merge PR to `main`.
- Delete feature branch (or archive if needed).
- Update `CURRENT_WORK.md` with start/end/result and references.

## 3. Hard Gates

Work is considered incomplete if any gate is missing:

- no Linear issue link,
- no feature branch,
- no PR with spec link,
- no prefilled PR Title/Body from spec draft file,
- no green quality checks,
- no `CURRENT_WORK.md` update.

## 4. Exception Policy

Allowed only for production hotfixes.

Required even for hotfix:
- create `fix/*` note,
- open follow-up spec task to reconcile process artifacts.

## 5. Current Workstream

- Active spec: `specs/008-systems-lifecycle-and-tournament-usage`.
- Next phase: F04 (`T1130-T1133`).
