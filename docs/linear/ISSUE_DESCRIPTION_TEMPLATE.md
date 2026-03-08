# Linear Issue Description Template (SDD)

Use this template for every implementation issue in `BRI`.

## Source Spec

- `specs/<feature>/<file>.md`
- Parent issue: `BRI-XX`
- Workflow: `docs/WORKFLOW.md`

## Scope

- Item 1
- Item 2

## Out of Scope

- Item 1
- Item 2

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Test Evidence Required

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Manual QA evidence attached (for UI changes)

## Architecture References

- ADR (if needed): `docs/adr/ADR-XXXX-*.md`
- C4 (if needed): `docs/c4/*.mmd`

## Definition of Done

- [ ] Acceptance criteria completed
- [ ] PR links spec (and ADR if architecture changed)
- [ ] `fix/*` note added
