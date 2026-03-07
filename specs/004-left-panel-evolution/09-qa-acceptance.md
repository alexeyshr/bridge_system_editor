# F08 QA and Acceptance

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

- [ ] `npm run lint` passes
- [ ] no runtime errors in browser console
- [ ] all matrix items pass manually
- [ ] update `/fix` notes for delivered tasks
