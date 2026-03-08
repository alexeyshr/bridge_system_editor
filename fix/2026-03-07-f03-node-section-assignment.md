# 2026-03-07 - F03 Node Section Assignment

## Summary

Implemented node-to-section assignment and subtree assignment rules with UI entry points in both the sequence row and the right panel.

## Implemented

1. Store data model:
   - `nodeSectionIds` for direct memberships.
   - `subtreeRulesById` for section rules on subtree roots.
2. Store actions:
   - `assignNodeToSection`
   - `unassignNodeFromSection`
   - `setNodeSections`
   - `createSubtreeRule`
   - `deleteSubtreeRule`
3. Store selectors:
   - `getEffectiveSectionIds(nodeId)`
   - `getSubtreeRulesForNode(nodeId)`
4. Safety updates:
   - Delete section clears related direct memberships and subtree rules.
   - Delete node clears assignments/rules under deleted subtree.
   - Rename node remaps assignments/rule roots across renamed subtree.
5. UI:
   - `NodeSectionAssignment` component.
   - Sequence row action button with compact assignment popover.
   - Right panel section assignment block.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
