# Product Workflow

Last updated: 2026-03-08

Canonical delivery chain:

`IDEAS -> TRIAGE -> ROADMAP -> ADR/SPECS -> IMPLEMENTATION`

## 1) IDEAS

Source:
- `docs/source/IDEAS.md`

Purpose:
- capture all ideas without scope pressure,
- keep statuses (`💡`, `✏️`, `✅`, `❌`).

## 2) TRIAGE

Inputs:
- `docs/source/IDEAS.md`
- `docs/source/PRIORITIES.md`
- active constraints (team size, timeline, infra readiness)

Output:
- shortlist for roadmap placement (`Now`, `Next`, `Later`),
- explicit rejects with reason.
- cycle decisions recorded in:
  - `docs/TRIAGE.md`

### Definition of Ready (Triage)

- Idea is written in `docs/source/IDEAS.md`.
- Problem, target user, and expected value are understandable.
- Scope is small enough for one delivery cycle or can be split.

### Definition of Done (Triage)

- Idea is mapped to `Now`, `Next`, or `Later` in `docs/ROADMAP.md`, or marked rejected with reason.
- If accepted, ownership and next artifact (`ADR` and/or `spec`) are clear.

## 3) ROADMAP

Source:
- `docs/ROADMAP.md`

Purpose:
- decide sequence and timing layer,
- limit concurrent work.

### Definition of Ready (Roadmap Item)

- Item passed triage.
- Dependencies and risks are identified at a high level.
- Priority is consistent with `docs/source/PRIORITIES.md`.

### Definition of Done (Roadmap Item)

- Item has explicit placement (`Now` or `Next` or `Later`).
- `Now` items have a planned path to `specs/<feature>/`.
- If architecture impact is expected, ADR requirement is noted.

## 4) ADR/SPECS

- ADR required when architecture boundaries change (`docs/adr/`).
- Spec required for any implementation item (`specs/<feature>/`).

### Definition of Ready (ADR/Spec)

- Roadmap item is in `Now`.
- Feature boundary and non-goals are defined.
- Known architecture risks are listed.

### Definition of Done (ADR/Spec)

- ADR approved (when required) and linked from spec.
- Spec package exists (`spec.md`, `plan.md`, `tasks.md`).
- Acceptance criteria and test evidence expectations are explicit.

## 5) IMPLEMENTATION

- only from approved specs,
- evidence in tests/build + `fix/*` notes.

### Definition of Ready (Implementation)

- Approved spec exists.
- Tasks are actionable and sequenced.
- Required environment/flags are documented.

### Definition of Done (Implementation)

- Code merged via PR with required checks green (`lint`, `typecheck`, `test`, `build`).
- PR includes spec link and ADR link when architecture changed.
- `fix/*` note added; `expirience/*` added if incident/regression occurred.
- Docs/roadmap updated when scope or decisions changed.

## GitHub Gate Checklist

- Branch from feature branch (no direct push to `main`).
- PR template fully filled (`Spec Link`, scope, acceptance, test evidence).
- Review comments resolved.
- Required status checks passed.
- Merge only after policy checks and approvals.

## Linear Conventions

- Parent issue per feature stream (for example `PR-8`).
- Child issues map 1:1 to spec milestones/tasks.
- Issue description follows:
  - `docs/linear/ISSUE_DESCRIPTION_TEMPLATE.md`

## Archive Input

- `docs/archive/TZ.md` is historical context only.
- It is not a planning or execution source.
