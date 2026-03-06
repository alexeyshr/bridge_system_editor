## Fix: completed SDD CI baseline with Test check and merge queue compatibility

- Date: 2026-03-06

### Changes

1. Added real `test` script in `package.json`:
   - `npm run test` -> `node --test`
2. Added minimal smoke test:
   - `tests/sdd-smoke.test.mjs`
3. Updated CI workflow:
   - added `Test` job
   - added `merge_group` trigger for merge queue
4. Updated SDD setup checklist:
   - required check `Test`
   - click-by-click setup order in GitHub Settings

### Result

- Required checks set now can include:
  - `Spec Check`
  - `Lint`
  - `Typecheck`
  - `Test`
  - `Build`
- Workflow is compatible with merge queue (`merge_group` event).
