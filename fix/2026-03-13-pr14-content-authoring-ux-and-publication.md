# Fix Note: PR-14 Content Authoring UX and Publication Workflow

Date: 2026-03-13

## Scope Delivered

- Added content workspace routes:
  - `/dashboard/content`
  - `/dashboard/content/new`
  - `/dashboard/content/[contentId]/edit`
  - updated `/dashboard/content/[contentId]` view.
- Implemented block-based authoring UI for:
  - `text`, `callout`, `deal`, `auction`, `question`, `answer`.
- Added draft create/update flow with save-state UX:
  - `dirty`, `saving`, `saved`, `error`.
- Added lifecycle actions with guardrails:
  - publish/archive confirmation,
  - hidden-space + public-content visibility warning.
- Integrated content discovery entry points in sidebar/dashboard.

## Key Files

- `components/portal-page-shell.tsx`
- `components/content-block-renderer.tsx`
- `components/content-editor-workspace.tsx`
- `app/dashboard/content/page.tsx`
- `app/dashboard/content/new/page.tsx`
- `app/dashboard/content/[contentId]/edit/page.tsx`
- `app/dashboard/content/[contentId]/page.tsx`
- `lib/portal-config/sidebar.ts`
- `components/dashboard-summary-widget.tsx`
- `specs/012-content-authoring-ux-and-publication/*`

## Quality Gate

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test` passed
- `npm run build` passed

## Notes

- Build logs still include external Postgres connection warnings for remote data sources in summary/tournament queries, but build completes successfully.
