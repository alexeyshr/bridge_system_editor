# PR Title

`feat(collaboration): add access-control matrix and endpoint capability guards`

# PR Body

## Spec Link

- `specs/009-collaboration-discussions-and-sharing/spec.md`
- `specs/009-collaboration-discussions-and-sharing/plan.md`
- `specs/009-collaboration-discussions-and-sharing/tasks.md`

## Scope

- F01 only: access-control matrix foundation.
- Introduced explicit capability matrix for `owner/editor/reviewer/viewer/none`.
- Enforced capability checks on collaboration endpoints (`shares`, `invites`, `users.search`).
- Added reviewer support in access/validation/contracts and DB enum.

## Out of Scope

- Invite flow UX improvements (F02).
- Discussion threads and mentions (F03).
- Read-only publish links (F04).
- Observability rollout package (F05).

## Acceptance Criteria Coverage

- AC-01 covered by role capability matrix + endpoint guards.
- AC-07 covered by explicit `reviewer` role (read/comment only).
- AC-08 covered by policy checks for viewer role restrictions.

## Test Evidence

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Linked Issue

- Linear: `BRI-65`

## PR Link

- _to be added after opening PR_
