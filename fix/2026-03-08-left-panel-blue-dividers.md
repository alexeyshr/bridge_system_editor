# UI Tweak: Blue Dividers Between Left Panel Sections

Date: 2026-03-08

## Request

Highlight separator lines in the left panel with a blue color between main sections.

## Applied

File:
- `components/LeftPanel.tsx`

Changes:
- Main section separators updated to stronger soft blue: `border-t-2 border-[#BFDBFE]`
  - before `SECTIONS`
  - before `BOOKMARKS`
  - before `SMART VIEWS`
- Subsection separator in `ROOTS` updated to soft blue: `border-t border-[#BFDBFE]`
  - between `OUR ROOTS` and `SEQUENCE / OPP ROOTS`

## Verification

- `npm run typecheck` passed
- `npm run lint` passed
