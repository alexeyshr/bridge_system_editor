# PR-91: F01 Drizzle-Only Cutover and Prisma Removal

## PR Title

`PR-91: F01 Drizzle-only cutover and Prisma removal`

## PR Body

### Spec Link

- `specs/005-platform-core-hardening/spec.md`
- `specs/005-platform-core-hardening/plan.md`
- `specs/005-platform-core-hardening/tasks.md`

### Scope

- Remove Prisma runtime path and drivers.
- Migrate auth/register/search/access checks to Drizzle.
- Replace Prisma-vs-Drizzle parity with Drizzle-only integration checks.
- Clean onboarding/runtime docs and scripts from Prisma/dual-write flags.

### Out Of Scope

- Zustand slice refactor and error boundaries (`F02`).
- Auth stack migration decision/implementation (`F03`).
- Search indexing, SSE, observability (`F04+`).

### Acceptance Criteria

- AC-01 (`specs/005`): Prisma runtime path removed, Drizzle is single path.
- Updated tests and docs reflect Drizzle-only architecture.

### Test Evidence

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test` passed
- `npm run build` passed

### Architecture References

- `docs/adr/ADR-0003-drizzle-only-cutover-and-prisma-removal.md`
- `docs/c4/c3-components-api.mmd`

### Definition of Done

- [x] Acceptance criteria completed
- [x] Spec/task references updated in PR
- [x] Fix note added: `fix/2026-03-07-f01-drizzle-only-cutover.md`

## PR Link

- `<to be added after PR creation>`
