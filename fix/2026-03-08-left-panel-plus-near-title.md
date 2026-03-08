# UI Tweak: Plus Button Near Group Title, Chevron Kept Right

Date: 2026-03-08

## Request

- Keep collapse/expand chevrons aligned on the right for all top-level groups.
- Move `+` button near the group title (with small spacing), not near the right edge.

## Applied

File: `components/LeftPanel.tsx`

- `SECTIONS` header:
  - title on the left
  - `+` immediately after title
  - chevron remains at far right
- `SMART VIEWS` header:
  - same behavior for consistency

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
