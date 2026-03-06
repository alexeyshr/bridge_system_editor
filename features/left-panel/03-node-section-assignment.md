# F03 Node Section Assignment

## Goal

Allow users to assign one node or entire subtree to one or more sections.

## Scope

- Direct membership: node -> section ids.
- Subtree rules: section + root node + include descendants.
- Assignment UI from node row and right card.
- Default subtree behavior: include future descendants (`includeFutureDescendants = true`).

## Out of Scope

- Smart view logic.

## Implementation Tasks

1. Add `nodeSectionIds` and `subtreeRulesById` in store.
2. Implement actions:
   - `assignNodeToSection`
   - `unassignNodeFromSection`
   - `setNodeSections`
   - `createSubtreeRule`
   - `deleteSubtreeRule`
3. Add selector `getEffectiveSectionIds(nodeId)`.
4. Add assignment popover/modal with:
   - apply to node
   - apply to subtree
   - remove assignment

## Done Criteria

- One node can belong to multiple sections.
- Subtree assignment includes existing descendants.
- Future descendants are included by default.
- Deleting a section removes related memberships/rules safely.
