# F07 Store Method Mapping (No Regression Order)

## Goal

Define exactly how current store methods must be extended for sections/smart-views support.

## Current Methods to Extend

- `addNode`
- `renameNode`
- `deleteNode`
- `importYaml`
- `exportYaml`

## Mapping Table

| Method | Required Extension | Why |
|---|---|---|
| `addNode(parentId, call)` | 1) keep current behavior 2) apply inherited subtree rules from parent path 3) optionally set direct section ids if created from filtered section context | new nodes must appear in section-filtered views consistently |
| `renameNode(id, newCall)` | 1) rename node ids as now 2) remap keys in `nodeSectionIds` for renamed node and descendants 3) remap `subtreeRulesById[].rootNodeId` if it points into renamed subtree 4) remap `selectedNodeId` and active filter references if needed | rename currently rewrites ids; section references must follow new ids |
| `deleteNode(id)` | 1) keep subtree deletion 2) remove `nodeSectionIds` for deleted nodes 3) remove subtree rules rooted in deleted nodes 4) clear selection if deleted | avoid orphan memberships/rules |
| `importYaml(yamlString)` | 1) detect schema version 2) load legacy array format into nodes only 3) load v2 object format with sections/smart-views 4) sanitize broken references | backward compatibility and stable load |
| `exportYaml()` | 1) keep legacy mode only if explicitly requested 2) default export `schemaVersion: 2` object 3) include sections, memberships, subtree rules, smart views | persistence of new left-panel functionality |

## Additional Locked Rules

1. `createSubtreeRule` default must be `includeFutureDescendants = true`.
2. `deleteSection(sectionId)` must move child sections to deleted section parent.
3. English-only UI strings in left panel for this release.

## Safe Rollout Order

1. Add new section state shape and helper selectors (no UI wiring).
2. Extend `deleteNode` with cleanup logic.
3. Extend `renameNode` with id remap logic.
4. Extend `addNode` with inherited section behavior.
5. Add v2 `importYaml` parser with legacy fallback.
6. Add v2 `exportYaml`.
7. Wire UI components to new state/actions.

## Regression Checklist per Method

1. Existing tree expand/collapse still works.
2. Existing right card open/edit still works.
3. Existing add/delete popovers still work.
4. Import of old YAML files still loads nodes.
5. Export/import roundtrip preserves sections.
