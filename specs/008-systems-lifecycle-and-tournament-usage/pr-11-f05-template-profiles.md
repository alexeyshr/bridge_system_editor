# PR-11: F05 Template Profiles

## PR Link

- https://github.com/alexeyshr/bridge_system_editor/compare/main...codex/BRI-63-f05-template-profiles

## PR Title

`feat(spec-008): implement F05 template profiles and create-from-template flow`

## PR Body

### Spec Link

- `specs/008-systems-lifecycle-and-tournament-usage/spec.md`

### Scope

- Add bootstrap template profiles:
  - `Standard`
  - `2/1`
  - `Precision`
- Extend create-system contract with optional `templateId`.
- Seed template nodes during system creation in Drizzle driver.
- Add template selection in Systems Hub create flow.
- Add test coverage for template metadata/seed generation and create routing.

### Out of Scope

- Tournament binding lifecycle (`F04`)
- Final acceptance/documentation closure (`F06`)

### Acceptance Criteria

- Template metadata is exposed for all three profiles.
- Creating system with `templateId` pre-populates bidding nodes.
- Systems Hub allows selecting template before create.
- Router forwards template input to service layer.
- Automated tests cover template generation and create flow.

### Test Evidence Required

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
