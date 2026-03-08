# UI Tweak: Section Numbering and Hierarchical Font Scaling

Date: 2026-03-08

## Request

In the left `SECTIONS` panel:
- make section title font a bit smaller,
- auto-number sections and subsections (`1.`, `1.1.`, `1.2.`, `2.1.` ...),
- render each deeper subsection slightly smaller than its parent.

## Applied

File:
- `components/LeftPanel.tsx`

Changes:
- Added computed hierarchical numbering in section row renderer:
  - root level: `1.`, `2.`, `3.`
  - nested level: `1.1.`, `1.2.`, `2.1.` etc.
- Numbering is display-driven by current sibling order (no mutation of stored section names).
- Reduced section name font size and added depth-based scaling:
  - level 0: 13px
  - level 1: 12px
  - level 2+: min 11px
- Slightly adjusted line height by depth for consistent density.

## Notes

- Data model remains unchanged (section names are clean, without prefixed numbers).
- Numbering updates automatically when order/hierarchy changes.

## Verification

- `npm run typecheck` passed
- `npm run lint` passed
