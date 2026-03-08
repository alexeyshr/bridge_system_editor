# UI Fix: Left Panel Chevron Alignment

Date: 2026-03-08

## Change

Unified collapse/expand chevron placement for left panel top-level groups:
- Roots
- Sections
- Bookmarks
- Smart Views

All group headers now use the same pattern:
- group icon + title on the left
- chevron on the right side of header

File:
- `components/LeftPanel.tsx`

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
