# UI Enhancement: Collapsible Left Panel Groups

Date: 2026-03-08

## Request

Make top-level left panel groups collapsible:
- Roots
- Sections
- Bookmarks
- Smart Views

## Implementation

File: `components/LeftPanel.tsx`

- Added local collapsed/expanded states for each top-level group.
- Added chevron toggles in group headers.
- Preserved existing actions:
  - create section (`+`)
  - create smart view (`+`)
  - section/smart-view row actions

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
