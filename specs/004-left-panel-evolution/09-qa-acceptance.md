# F09 QA and Acceptance

## Goal

Verify functional correctness and prevent regressions before release.

## Test Matrix

1. Sections CRUD
   - create root/nested
   - rename
   - move
   - delete (nodes remain)
2. Assignment
   - node to multiple sections
   - subtree assignment
   - delete section cleans memberships
3. Filters
   - section filter
   - smart-view filter
   - clear filter
4. Existing behavior regression
   - left panel collapse
   - right panel card open on node click
   - tree expand/collapse
   - add/delete popovers
5. Persistence
   - export/import roundtrip
   - legacy import migration

## Release Checklist

- [x] `npm run lint` passes
- [x] no runtime errors in browser console
- [x] all matrix items pass manually
- [x] update `/fix` notes for delivered tasks

## Evidence

- `npm run lint` (pass)
- `npm run typecheck` (pass)
- `npm run test` (pass)
- `npm run build` (pass)
- `npm run ui:baseline` (pass)
- Report: `tests/ui-baseline/f09-qa-acceptance-run-2026-03-07.md`
