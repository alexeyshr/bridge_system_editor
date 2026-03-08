# UI Tweak: Sections/Smart Views Header Controls Order

Date: 2026-03-08

## Change

Adjusted header control order to match requested layout:
- left: section group icon + title
- right: collapse/expand chevron
- far right: plus button

Applied to:
- `SECTIONS`
- `SMART VIEWS`

File:
- `components/LeftPanel.tsx`

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
