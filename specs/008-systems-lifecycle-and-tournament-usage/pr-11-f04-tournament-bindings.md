# PR-11: F04 Tournament Usage Binding

## PR Link

- https://github.com/alexeyshr/bridge_system_editor/compare/main...codex/spec-008-f04-tournament-bindings

## PR Title

`feat(spec-008): implement F04 tournament bindings UI and freeze transitions`

## PR Body

### Spec Link

- `specs/008-systems-lifecycle-and-tournament-usage/spec.md`

### Scope

- Add tournament binding management flows in lifecycle UI:
  - bind version by scope (`global`, `pair`, `team`)
  - remove binding
  - freeze single binding
  - freeze all bindings for tournament
- Extend validation/router/service contracts for new binding actions.
- Enforce frozen-state transition guardrails in Drizzle driver.
- Add router/parity tests for binding transitions.

### Out of Scope

- Template profile bootstrap (`F05`)
- Discussion/comments/sharing features (`specs/009`)

### Acceptance Criteria

- User can create binding by tournament/scope/version from lifecycle UI.
- User can remove active binding from lifecycle UI.
- User can freeze single binding and freeze all bindings for tournament.
- Frozen bindings cannot be updated or removed.
- New transition flows covered by automated tests.

### Test Evidence Required

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
