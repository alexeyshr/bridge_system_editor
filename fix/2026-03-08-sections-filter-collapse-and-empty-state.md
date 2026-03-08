# Bugfix: Sections Filter Collapse + Empty Section Visibility

Date: 2026-03-08

## Issues

1. In `Sections` filter mode, center-tree expand/collapse did not work.
2. Selecting a section with no assigned nodes could still show sequence history in center panel.

## Root Cause

- `CenterPanel` had forced expansion of ancestors for all primary filters, which effectively overrode manual collapse behavior.
- Display/match resolution relied on fallback logic from store helpers; in section mode this could degrade to showing broader node sets instead of strict section-only results in edge states.

## Fix

File: `components/CenterPanel.tsx`

- Removed forced-expanded override in filtered views.
- Implemented explicit section-mode matching:
  - if `leftPrimaryMode === 'sections'` and section is invalid/empty => matched list is empty.
  - otherwise match strictly via `getEffectiveSectionIds(nodeId).includes(activeSectionId)`.
- Built display IDs locally from matched nodes + ancestors only.
- Hid current-sequence breadcrumb when selected node is outside current filtered display.
- Added explicit empty-state messages for section/smart-view filtered modes.

## Verification

- `npm run lint` passed
- `npm run typecheck` passed
