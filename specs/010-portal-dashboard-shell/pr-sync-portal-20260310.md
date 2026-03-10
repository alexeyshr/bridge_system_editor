# PR Draft: Portal Dashboard Shell Sync

## Title

`feat(portal): sync dashboard shell and sidebar foundations`

## Body

## Spec Link

- `specs/010-portal-dashboard-shell/pr-sync-portal-20260310.md`

## Scope

- Sync user-authored portal shell work from local `bridge_system_editor_sync` into GitHub branch.
- Add dashboard route and shell composition:
  - `app/dashboard/page.tsx`
  - sidebar/navigation/ui support components under `components/*`.
- Add logo and favicon assets for dashboard shell:
  - `public/main-logo.svg`
  - `public/main-logo-transparent.png`
  - `public/dashboard-toggle-favicon.svg`
- Keep latest server ops changes from `origin/main` in the same branch via merge.

## Out of scope

- Full portal information architecture.
- Back-end API design changes.
- Production deploy of this branch.

## Acceptance criteria

- Branch contains both:
  - latest `origin/main` updates,
  - local portal shell changes.
- PR can be merged without losing either side.

## Test evidence

- Manual sync verification:
  - local changes committed,
  - merged with `origin/main` without conflicts,
  - branch pushed to GitHub.
