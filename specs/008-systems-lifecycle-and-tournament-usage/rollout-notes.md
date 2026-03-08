# Rollout Notes: Spec 008

Date: 2026-03-09  
Scope: Systems lifecycle, tournament usage binding, template bootstrap

## Implemented Scope

- Systems Hub list/filter/open flow (`F02`)
- Draft/Published lifecycle (`F03`)
- Tournament bindings with freeze transitions (`F04`, in dedicated branch)
- Template profiles and create-from-template flow (`F05`)

## Quality Gate Evidence

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅

## Migration Constraints

1. Draft auto-sync keeps server revision as source of truth.
2. `createSystem` now accepts optional `templateId`; existing clients remain compatible.
3. Template seeding writes initial nodes at system creation with revision `1`.
4. Tournament binding contract uses immutable `systemId + versionId` references.
5. Frozen tournament bindings must be immutable for update/remove operations.

## Backward Compatibility

- Existing blank system creation path is preserved.
- Existing YAML import/export workflow remains unchanged.
- Existing systems without template metadata are valid and require no migration.

## Rollout Order

1. Merge `F04` branch to `main`.
2. Merge `F05` branch to `main`.
3. Run post-merge smoke:
   - create blank system,
   - create each template profile,
   - publish version and bind tournament scope,
   - freeze binding and verify conflict on mutating frozen binding.

## Rollback Strategy

- If UI regressions occur, disable template usage in Systems Hub by reverting `components/SystemsHubMenu.tsx`.
- If backend contract issues occur, revert `templateId` support in router/validation and keep blank create path.
- For binding transition regressions, rollback to pre-`F04` lifecycle controls and keep bindings read-only until fix.
