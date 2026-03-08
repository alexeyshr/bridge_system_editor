import test from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { useBiddingStore } from '../store/useBiddingStore';
import { canonicalizeNodeId } from '../lib/bidding-steps';

const baseline = useBiddingStore.getState();

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nid(path: string): string {
  return canonicalizeNodeId(path);
}

function resetStoreState(): void {
  useBiddingStore.setState(
    {
      ...baseline,
      nodes: deepCopy(baseline.nodes),
      selectedNodeId: null,
      rootEntryNodeIds: [],
      activeRootEntryNodeId: null,
      sectionsById: {},
      sectionRootOrder: [],
      nodeSectionIds: {},
      subtreeRulesById: {},
      customSmartViewsById: {},
      customSmartViewOrder: [],
      smartViewPinnedById: {},
      nodeTouchedAtById: {},
      sectionExpandedById: {},
      leftPrimaryMode: 'roots',
      activeSectionId: null,
      activeSmartViewId: null,
      hasUnsavedChanges: false,
      serverSyncError: null,
    },
    true,
  );
}

test.beforeEach(() => {
  resetStoreState();
});

test('creates root and nested sections, exposes path and tree selectors', () => {
  const rootResult = useBiddingStore.getState().createSection('Openings');
  assert.equal(rootResult.ok, true);
  assert.equal(typeof rootResult.sectionId, 'string');

  const rootId = rootResult.sectionId as string;
  const childResult = useBiddingStore.getState().createSection('Major openings', rootId);
  assert.equal(childResult.ok, true);
  assert.equal(typeof childResult.sectionId, 'string');

  const childId = childResult.sectionId as string;
  const state = useBiddingStore.getState();
  const path = state.getSectionPath(childId);
  assert.deepEqual(path.map((section) => section.name), ['Openings', 'Major openings']);

  const tree = state.getSectionTree();
  assert.equal(tree.length, 1);
  assert.equal(tree[0].section.id, rootId);
  assert.equal(tree[0].children.length, 1);
  assert.equal(tree[0].children[0].section.id, childId);
});

test('validates section names and duplicate names within same parent', () => {
  const openings = useBiddingStore.getState().createSection('Openings');
  assert.equal(openings.ok, true);
  const openingsId = openings.sectionId as string;

  const duplicateRoot = useBiddingStore.getState().createSection('  openings  ');
  assert.equal(duplicateRoot.ok, false);

  const conventions = useBiddingStore.getState().createSection('Conventions');
  assert.equal(conventions.ok, true);
  const conventionsId = conventions.sectionId as string;

  const childA = useBiddingStore.getState().createSection('Transfers', openingsId);
  const childB = useBiddingStore.getState().createSection('Transfers', conventionsId);
  assert.equal(childA.ok, true);
  assert.equal(childB.ok, true);

  const renameConflict = useBiddingStore.getState().renameSection(conventionsId, 'Openings');
  assert.equal(renameConflict.ok, false);
});

test('supports reorder and move while preserving stable order values', () => {
  const a = useBiddingStore.getState().createSection('A');
  const b = useBiddingStore.getState().createSection('B');
  const c = useBiddingStore.getState().createSection('C');

  assert.equal(a.ok && b.ok && c.ok, true);
  const aId = a.sectionId as string;
  const bId = b.sectionId as string;
  const cId = c.sectionId as string;

  const reorder = useBiddingStore.getState().reorderSection(cId, 0);
  assert.equal(reorder.ok, true);
  assert.deepEqual(useBiddingStore.getState().sectionRootOrder, [cId, aId, bId]);

  const child = useBiddingStore.getState().createSection('A1', aId);
  assert.equal(child.ok, true);
  const childId = child.sectionId as string;

  const move = useBiddingStore.getState().moveSection(childId, null, 1);
  assert.equal(move.ok, true);

  const state = useBiddingStore.getState();
  const roots = state.getSectionChildren(null);
  assert.deepEqual(roots.map((section) => section.id), [cId, childId, aId, bId]);
  roots.forEach((section, index) => {
    assert.equal(section.order, index);
  });
});

test('moveSection rejects invalid hierarchy targets (self and descendant)', () => {
  const root = useBiddingStore.getState().createSection('Openings');
  assert.equal(root.ok, true);
  const rootId = root.sectionId as string;

  const child = useBiddingStore.getState().createSection('Responses', rootId);
  assert.equal(child.ok, true);
  const childId = child.sectionId as string;

  const grandChild = useBiddingStore.getState().createSection('Competitive', childId);
  assert.equal(grandChild.ok, true);
  const grandChildId = grandChild.sectionId as string;

  const moveIntoSelf = useBiddingStore.getState().moveSection(childId, childId, 0);
  assert.equal(moveIntoSelf.ok, false);

  const moveIntoDescendant = useBiddingStore.getState().moveSection(rootId, grandChildId, 0);
  assert.equal(moveIntoDescendant.ok, false);

  const state = useBiddingStore.getState();
  assert.equal(state.sectionsById[rootId].parentId, null);
  assert.equal(state.sectionsById[childId].parentId, rootId);
  assert.equal(state.sectionsById[grandChildId].parentId, childId);
});

test('moveSection preserves source and target sibling integrity during reparent', () => {
  const a = useBiddingStore.getState().createSection('A');
  const b = useBiddingStore.getState().createSection('B');
  const c = useBiddingStore.getState().createSection('C');
  assert.equal(a.ok && b.ok && c.ok, true);
  const aId = a.sectionId as string;
  const bId = b.sectionId as string;
  const cId = c.sectionId as string;

  const b1 = useBiddingStore.getState().createSection('B1', bId);
  const b2 = useBiddingStore.getState().createSection('B2', bId);
  assert.equal(b1.ok && b2.ok, true);
  const b1Id = b1.sectionId as string;
  const b2Id = b2.sectionId as string;

  const moveResult = useBiddingStore.getState().moveSection(cId, bId, 1);
  assert.equal(moveResult.ok, true);

  const rootsAfterMove = useBiddingStore.getState().getSectionChildren(null);
  assert.deepEqual(rootsAfterMove.map((section) => section.id), [aId, bId]);

  const bChildrenAfterMove = useBiddingStore.getState().getSectionChildren(bId);
  assert.deepEqual(bChildrenAfterMove.map((section) => section.id), [b1Id, cId, b2Id]);
  bChildrenAfterMove.forEach((section, index) => {
    assert.equal(section.order, index);
  });
});

test('deleting section moves children to parent and does not delete bidding nodes', () => {
  const beforeNodeCount = Object.keys(useBiddingStore.getState().nodes).length;
  useBiddingStore.getState().addNode(null, '2C');

  const root = useBiddingStore.getState().createSection('Responses');
  assert.equal(root.ok, true);
  const rootId = root.sectionId as string;

  const child1 = useBiddingStore.getState().createSection('Weak', rootId);
  const child2 = useBiddingStore.getState().createSection('Invite', rootId);
  assert.equal(child1.ok && child2.ok, true);
  const child1Id = child1.sectionId as string;
  const child2Id = child2.sectionId as string;

  const grandChild = useBiddingStore.getState().createSection('NF', child1Id);
  assert.equal(grandChild.ok, true);
  const grandChildId = grandChild.sectionId as string;

  const deletion = useBiddingStore.getState().deleteSection(rootId);
  assert.equal(deletion.ok, true);

  const state = useBiddingStore.getState();
  assert.equal(state.sectionsById[rootId], undefined);
  assert.equal(state.sectionsById[child1Id]?.parentId, null);
  assert.equal(state.sectionsById[child2Id]?.parentId, null);
  assert.equal(state.sectionsById[grandChildId]?.parentId, child1Id);
  assert.equal(Object.keys(state.nodes).length, beforeNodeCount + 1);
});

test('section expansion state toggles in session and cleans up on delete', () => {
  const root = useBiddingStore.getState().createSection('Competitive');
  assert.equal(root.ok, true);
  const sectionId = root.sectionId as string;

  const beforeToggle = useBiddingStore.getState().sectionExpandedById[sectionId];
  assert.equal(beforeToggle, true);

  useBiddingStore.getState().toggleSectionExpanded(sectionId);
  assert.equal(useBiddingStore.getState().sectionExpandedById[sectionId], false);

  useBiddingStore.getState().setSectionExpanded(sectionId, true);
  assert.equal(useBiddingStore.getState().sectionExpandedById[sectionId], true);

  useBiddingStore.getState().deleteSection(sectionId);
  assert.equal(useBiddingStore.getState().sectionExpandedById[sectionId], undefined);
});

test('node can be assigned to multiple sections and effective list includes direct sections', () => {
  const openings = useBiddingStore.getState().createSection('Openings');
  const competitive = useBiddingStore.getState().createSection('Competitive');
  assert.equal(openings.ok && competitive.ok, true);
  const openingsId = openings.sectionId as string;
  const competitiveId = competitive.sectionId as string;

  const nodeId = '1C';
  const assignA = useBiddingStore.getState().assignNodeToSection(nodeId, openingsId);
  const assignB = useBiddingStore.getState().assignNodeToSection(nodeId, competitiveId);
  assert.equal(assignA.ok && assignB.ok, true);

  const effective = useBiddingStore.getState().getEffectiveSectionIds(nodeId);
  assert.deepEqual(new Set(effective), new Set([openingsId, competitiveId]));
});

test('subtree rule applies to existing and future descendants by default', () => {
  const section = useBiddingStore.getState().createSection('1C System');
  assert.equal(section.ok, true);
  const sectionId = section.sectionId as string;

  const rule = useBiddingStore.getState().createSubtreeRule(sectionId, '1C', true);
  assert.equal(rule.ok, true);

  const existingNodeEffective = useBiddingStore.getState().getEffectiveSectionIds('1C 1D');
  assert.deepEqual(new Set(existingNodeEffective), new Set([sectionId]));

  useBiddingStore.getState().addNode('1C 1D 1H 2D', '2H');
  const futureNodeEffective = useBiddingStore.getState().getEffectiveSectionIds('1C 1D 1H 2D 2H');
  assert.deepEqual(new Set(futureNodeEffective), new Set([sectionId]));
});

test('deleting section removes related node assignments and subtree rules', () => {
  const secA = useBiddingStore.getState().createSection('A');
  const secB = useBiddingStore.getState().createSection('B');
  assert.equal(secA.ok && secB.ok, true);
  const secAId = secA.sectionId as string;
  const secBId = secB.sectionId as string;

  useBiddingStore.getState().assignNodeToSection('1C', secAId);
  useBiddingStore.getState().assignNodeToSection('1C', secBId);
  useBiddingStore.getState().createSubtreeRule(secAId, '1C', true);

  const delResult = useBiddingStore.getState().deleteSection(secAId);
  assert.equal(delResult.ok, true);

  const state = useBiddingStore.getState();
  assert.equal(state.sectionsById[secAId], undefined);
  assert.deepEqual(state.nodeSectionIds[nid('1C')], [secBId]);
  assert.equal(
    Object.values(state.subtreeRulesById).some((rule) => rule.sectionId === secAId),
    false,
  );
});

test('renaming node remaps direct assignment and subtree rule roots', () => {
  const section = useBiddingStore.getState().createSection('Relay');
  assert.equal(section.ok, true);
  const sectionId = section.sectionId as string;

  useBiddingStore.getState().assignNodeToSection('1C 1D', sectionId);
  useBiddingStore.getState().createSubtreeRule(sectionId, '1C 1D', true);

  useBiddingStore.getState().renameNode('1C 1D', '1H');
  const state = useBiddingStore.getState();

  assert.equal(state.nodeSectionIds[nid('1C 1D')], undefined);
  assert.deepEqual(state.nodeSectionIds[nid('1C 1H')], [sectionId]);
  assert.equal(
    Object.values(state.subtreeRulesById).some((rule) => rule.rootNodeId === nid('1C 1H')),
    true,
  );
});

test('built-in smart views are available and counts are computed', () => {
  const smartViews = useBiddingStore.getState().getSmartViews();
  const builtInIds = new Set(smartViews.filter((item) => item.isBuiltIn).map((item) => item.id));
  assert.equal(builtInIds.has('sv_unassigned'), true);
  assert.equal(builtInIds.has('sv_bookmarked'), true);
  assert.equal(builtInIds.has('sv_no_notes'), true);
  assert.equal(builtInIds.has('sv_unaccepted'), true);
  assert.equal(builtInIds.has('sv_recently_edited'), true);
  assert.equal(builtInIds.has('sv_competitive_only'), true);
  assert.equal(builtInIds.has('sv_has_opponent_action'), true);
  assert.equal(builtInIds.has('sv_dead_ends'), true);
  assert.equal(builtInIds.has('sv_no_meaning'), true);
  assert.equal(builtInIds.has('sv_no_hcp'), true);
  assert.equal(builtInIds.has('sv_no_forcing'), true);
  assert.equal(builtInIds.has('sv_conflict_tags'), true);

  const section = useBiddingStore.getState().createSection('Test');
  assert.equal(section.ok, true);
  const sectionId = section.sectionId as string;
  useBiddingStore.getState().assignNodeToSection('1C', sectionId);

  const unassignedCount = useBiddingStore.getState().getSmartViewCount('sv_unassigned');
  const bookmarkedCount = useBiddingStore.getState().getSmartViewCount('sv_bookmarked');
  assert.equal(unassignedCount >= 1, true);
  assert.equal(bookmarkedCount, 0);
});

test('qa smart views match dead-ends, meaning gaps, and conflict tags', () => {
  useBiddingStore.getState().addNode(null, '2D');
  useBiddingStore.getState().addNode('2D', '2H');

  useBiddingStore.getState().updateNode(nid('2D'), {
    meaning: {
      ...(useBiddingStore.getState().nodes[nid('2D')].meaning || {}),
      forcing: 'ZZ',
      hcp: { min: 15, max: 12 },
      shows: ['fit', 'fit'],
      notes: 'custom meaning',
    },
  });
  useBiddingStore.getState().updateNode(nid('2D 2H'), { meaning: {} });

  assert.equal(useBiddingStore.getState().evalSmartView(nid('2D'), 'sv_dead_ends'), false);
  assert.equal(useBiddingStore.getState().evalSmartView(nid('2D 2H'), 'sv_dead_ends'), true);
  assert.equal(useBiddingStore.getState().evalSmartView(nid('2D'), 'sv_no_meaning'), false);
  assert.equal(useBiddingStore.getState().evalSmartView(nid('2D 2H'), 'sv_no_meaning'), true);
  assert.equal(useBiddingStore.getState().evalSmartView(nid('2D'), 'sv_no_hcp'), false);
  assert.equal(useBiddingStore.getState().evalSmartView(nid('2D'), 'sv_no_forcing'), false);
  assert.equal(useBiddingStore.getState().evalSmartView(nid('2D'), 'sv_conflict_tags'), true);

  assert.equal(useBiddingStore.getState().getSmartViewCount('sv_dead_ends') >= 1, true);
  assert.equal(useBiddingStore.getState().getSmartViewCount('sv_no_meaning') >= 1, true);
  assert.equal(useBiddingStore.getState().getSmartViewCount('sv_conflict_tags') >= 1, true);
});

test('custom smart view supports create, eval, pin and delete', () => {
  const create = useBiddingStore.getState().createCustomSmartView('Weak NT', 'weak', 'all');
  assert.equal(create.ok, true);
  const smartViewId = create.smartViewId as string;

  const match1 = useBiddingStore.getState().evalSmartView('1C 1D 1H 1NT', smartViewId);
  const match2 = useBiddingStore.getState().evalSmartView('1C 1D', smartViewId);
  assert.equal(match1, true);
  assert.equal(match2, false);

  const pinResult = useBiddingStore.getState().toggleSmartViewPinned(smartViewId);
  assert.equal(pinResult.ok, true);
  assert.equal(useBiddingStore.getState().smartViewPinnedById[smartViewId], true);

  const remove = useBiddingStore.getState().deleteCustomSmartView(smartViewId);
  assert.equal(remove.ok, true);
  assert.equal(useBiddingStore.getState().customSmartViewsById[smartViewId], undefined);
});

test('recently edited smart view reacts to node changes', () => {
  const beforeUpdate = useBiddingStore.getState().evalSmartView(nid('1C'), 'sv_recently_edited');
  assert.equal(beforeUpdate, false);

  useBiddingStore.getState().updateNode(nid('1C'), {
    meaning: {
      ...(useBiddingStore.getState().nodes[nid('1C')].meaning || {}),
      notes: 'Updated now',
    },
  });

  const afterUpdate = useBiddingStore.getState().evalSmartView(nid('1C'), 'sv_recently_edited');
  assert.equal(afterUpdate, true);
});

test('primary section filter returns matched ids and display includes ancestors', () => {
  const section = useBiddingStore.getState().createSection('Responses');
  assert.equal(section.ok, true);
  const sectionId = section.sectionId as string;

  useBiddingStore.getState().assignNodeToSection('1C 1D 1H 2D', sectionId);
  useBiddingStore.getState().setLeftPrimaryMode('sections');
  useBiddingStore.getState().setActiveSectionId(sectionId);

  const matched = useBiddingStore.getState().getPrimaryMatchedNodeIds();
  assert.deepEqual(matched, [nid('1C 1D 1H 2D')]);

  const display = new Set(useBiddingStore.getState().getDisplayNodeIdsWithAncestors());
  assert.equal(display.has(nid('1C')), true);
  assert.equal(display.has(nid('1C 1D')), true);
  assert.equal(display.has(nid('1C 1D 1H')), true);
  assert.equal(display.has(nid('1C 1D 1H 2D')), true);
});

test('primary smart view filter returns matched ids and display includes ancestors', () => {
  const custom = useBiddingStore.getState().createCustomSmartView('Weak', 'weak', 'all');
  assert.equal(custom.ok, true);
  const smartViewId = custom.smartViewId as string;

  useBiddingStore.getState().setLeftPrimaryMode('smartViews');
  useBiddingStore.getState().setActiveSmartViewId(smartViewId);

  const matchedSet = new Set(useBiddingStore.getState().getPrimaryMatchedNodeIds());
  assert.equal(matchedSet.has(nid('1C 1D 1H 1NT')), true);

  const display = new Set(useBiddingStore.getState().getDisplayNodeIdsWithAncestors());
  assert.equal(display.has(nid('1C')), true);
  assert.equal(display.has(nid('1C 1D')), true);
  assert.equal(display.has(nid('1C 1D 1H')), true);
  assert.equal(display.has(nid('1C 1D 1H 1NT')), true);
});

test('addNode auto-assigns active section when section filter is active', () => {
  const section = useBiddingStore.getState().createSection('Auto');
  assert.equal(section.ok, true);
  const sectionId = section.sectionId as string;

  useBiddingStore.getState().setLeftPrimaryMode('sections');
  useBiddingStore.getState().setActiveSectionId(sectionId);

  useBiddingStore.getState().addNode('1C 1D 1H 2D', '2S');
  const newNodeId = nid('1C 1D 1H 2D 2S');

  assert.deepEqual(useBiddingStore.getState().nodeSectionIds[newNodeId], [sectionId]);
  assert.equal(
    useBiddingStore.getState().getEffectiveSectionIds(newNodeId).includes(sectionId),
    true,
  );
});

test('roots can point to full sequences and filter subtree from that entry', () => {
  const rootResult = useBiddingStore.getState().addRootEntry(nid('1C 1D 1H'));
  assert.equal(rootResult.ok, true);

  useBiddingStore.getState().setLeftPrimaryMode('roots');
  useBiddingStore.getState().setActiveRootEntryNodeId(nid('1C 1D 1H'));

  const matched = new Set(useBiddingStore.getState().getPrimaryMatchedNodeIds());
  assert.equal(matched.has(nid('1C 1D')), false);
  assert.equal(matched.has(nid('1C 1D 1H')), true);
  assert.equal(matched.has(nid('1C 1D 1H 1S')), true);
  assert.equal(matched.has(nid('1C 1D 1H 1NT')), true);
  assert.equal(matched.has(nid('1C 1D 1H 2D')), true);
});

test('removing root entry does not delete bidding nodes', () => {
  const rootId = nid('1C 1D 1H');
  useBiddingStore.getState().addRootEntry(rootId);
  const removeResult = useBiddingStore.getState().removeRootEntry(rootId);
  assert.equal(removeResult.ok, true);
  assert.equal(!!useBiddingStore.getState().nodes[rootId], true);
  assert.equal(useBiddingStore.getState().rootEntryNodeIds.includes(rootId), false);
});

test('removing section links and subtree rules does not delete bidding nodes', () => {
  const section = useBiddingStore.getState().createSection('Safety');
  assert.equal(section.ok, true);
  const sectionId = section.sectionId as string;

  const rootNodeId = nid('1C 1D 1H');
  const childNodeId = nid('1C 1D 1H 2S');
  if (!useBiddingStore.getState().nodes[childNodeId]) {
    useBiddingStore.getState().addNode(rootNodeId, '2S');
  }

  const beforeNodeCount = Object.keys(useBiddingStore.getState().nodes).length;

  const assignResult = useBiddingStore.getState().assignNodeToSection(rootNodeId, sectionId);
  assert.equal(assignResult.ok, true);
  const unassignResult = useBiddingStore.getState().unassignNodeFromSection(rootNodeId, sectionId);
  assert.equal(unassignResult.ok, true);

  const ruleResult = useBiddingStore.getState().createSubtreeRule(sectionId, rootNodeId, true);
  assert.equal(ruleResult.ok, true);
  assert.equal(typeof ruleResult.ruleId, 'string');
  const ruleId = ruleResult.ruleId as string;
  const deleteRuleResult = useBiddingStore.getState().deleteSubtreeRule(ruleId);
  assert.equal(deleteRuleResult.ok, true);

  const state = useBiddingStore.getState();
  assert.equal(!!state.nodes[rootNodeId], true);
  assert.equal(!!state.nodes[childNodeId], true);
  assert.equal(Object.keys(state.nodes).length, beforeNodeCount);
  assert.equal(state.nodeSectionIds[rootNodeId], undefined);
  assert.equal(state.subtreeRulesById[ruleId], undefined);
});

test('undo/redo restores node add/remove mutations', () => {
  const state0 = useBiddingStore.getState();
  const beforeCount = Object.keys(state0.nodes).length;

  state0.addNode(null, '2D');
  const rootId = nid('2D');
  let state = useBiddingStore.getState();
  assert.equal(!!state.nodes[rootId], true);
  assert.equal(state.canUndo, true);

  state.undo();
  state = useBiddingStore.getState();
  assert.equal(!!state.nodes[rootId], false);
  assert.equal(Object.keys(state.nodes).length, beforeCount);
  assert.equal(state.canRedo, true);

  state.redo();
  state = useBiddingStore.getState();
  assert.equal(!!state.nodes[rootId], true);
  assert.equal(state.canUndo, true);
});

test('undo/redo restores root pin and unpin mutations', () => {
  const nodeId = nid('1C 1D 1H');
  const state0 = useBiddingStore.getState();

  const addResult = state0.addRootEntry(nodeId);
  assert.equal(addResult.ok, true);
  let state = useBiddingStore.getState();
  assert.equal(state.rootEntryNodeIds.includes(nodeId), true);

  const removeResult = state.removeRootEntry(nodeId);
  assert.equal(removeResult.ok, true);
  state = useBiddingStore.getState();
  assert.equal(state.rootEntryNodeIds.includes(nodeId), false);

  state.undo();
  state = useBiddingStore.getState();
  assert.equal(state.rootEntryNodeIds.includes(nodeId), true);

  state.redo();
  state = useBiddingStore.getState();
  assert.equal(state.rootEntryNodeIds.includes(nodeId), false);
});

test('import clears undo/redo history stacks', () => {
  const state0 = useBiddingStore.getState();
  state0.addNode(null, '2H');
  let state = useBiddingStore.getState();
  assert.equal(state.canUndo, true);

  const exported = state.exportYaml();
  state.importYaml(exported);
  state = useBiddingStore.getState();
  assert.equal(state.canUndo, false);
  assert.equal(state.canRedo, false);
});

test('multi-select batch actions update nodes in one flow', () => {
  const state0 = useBiddingStore.getState();
  const nodeA = nid('1C');
  const nodeB = nid('1C 1D');

  state0.setNodeSelection([nodeA, nodeB]);
  assert.deepEqual(new Set(useBiddingStore.getState().selectedNodeIds), new Set([nodeA, nodeB]));

  const section = useBiddingStore.getState().createSection('Batch');
  assert.equal(section.ok, true);
  const sectionId = section.sectionId as string;

  const assign = useBiddingStore.getState().batchAssignNodesToSection([nodeA, nodeB], sectionId);
  assert.equal(assign.ok, true);
  assert.equal(assign.updatedCount, 2);

  const bookmark = useBiddingStore.getState().batchSetBookmarks([nodeA, nodeB], true);
  assert.equal(bookmark.ok, true);
  assert.equal(bookmark.updatedCount, 2);

  const accept = useBiddingStore.getState().batchSetAccepted([nodeA, nodeB], true);
  assert.equal(accept.ok, true);
  assert.equal((accept.updatedCount ?? 0) >= 1, true);

  const pinRoots = useBiddingStore.getState().batchSetRootEntries([nodeA, nodeB], true);
  assert.equal(pinRoots.ok, true);
  assert.equal((pinRoots.updatedCount ?? 0) >= 1, true);

  const state = useBiddingStore.getState();
  assert.equal(state.getEffectiveSectionIds(nodeA).includes(sectionId), true);
  assert.equal(state.getEffectiveSectionIds(nodeB).includes(sectionId), true);
  assert.equal(!!state.nodes[nodeA].isBookmarked, true);
  assert.equal(!!state.nodes[nodeB].isBookmarked, true);
  assert.equal(!!state.nodes[nodeA].meaning?.accepted, true);
  assert.equal(!!state.nodes[nodeB].meaning?.accepted, true);
  assert.equal(state.rootEntryNodeIds.includes(nodeA), true);
  assert.equal(state.rootEntryNodeIds.includes(nodeB), true);
});

test('batch mutation can be undone as a single step', () => {
  const nodeA = nid('1C');
  const nodeB = nid('1C 1D');
  const state0 = useBiddingStore.getState();

  const result = state0.batchSetBookmarks([nodeA, nodeB], true);
  assert.equal(result.ok, true);
  assert.equal(result.updatedCount, 2);
  assert.equal(useBiddingStore.getState().canUndo, true);

  useBiddingStore.getState().undo();
  const state = useBiddingStore.getState();
  assert.equal(!!state.nodes[nodeA].isBookmarked, false);
  assert.equal(!!state.nodes[nodeB].isBookmarked, false);
});

test('adding top-level node auto-creates root entry and selecting root is persisted', () => {
  useBiddingStore.getState().addNode(null, '2D');
  const rootId = nid('2D');
  const state = useBiddingStore.getState();
  assert.equal(state.rootEntryNodeIds.includes(rootId), true);
  assert.equal(state.activeRootEntryNodeId, rootId);
});

test('export defaults to schema v2 and preserves sections/smart views after import', () => {
  const section = useBiddingStore.getState().createSection('Roundtrip');
  assert.equal(section.ok, true);
  const sectionId = section.sectionId as string;

  useBiddingStore.getState().assignNodeToSection(nid('1C'), sectionId);
  const custom = useBiddingStore.getState().createCustomSmartView('RT', 'weak', 'all');
  assert.equal(custom.ok, true);
  const smartViewId = custom.smartViewId as string;
  useBiddingStore.getState().toggleSmartViewPinned(smartViewId);
  useBiddingStore.getState().addRootEntry(nid('1C 1D 1H'));
  useBiddingStore.getState().setActiveRootEntryNodeId(nid('1C 1D 1H'));

  const serialized = useBiddingStore.getState().exportYaml();
  const parsed = yaml.load(serialized) as Record<string, unknown>;
  assert.equal(typeof parsed, 'object');
  assert.equal(parsed.schemaVersion, 2);

  useBiddingStore.getState().importYaml(serialized);
  const state = useBiddingStore.getState();

  assert.equal(!!state.sectionsById[sectionId], true);
  assert.deepEqual(state.nodeSectionIds[nid('1C')], [sectionId]);
  assert.equal(!!state.customSmartViewsById[smartViewId], true);
  assert.equal(state.smartViewPinnedById[smartViewId], true);
  assert.equal(state.rootEntryNodeIds.includes(nid('1C 1D 1H')), true);
  assert.equal(state.activeRootEntryNodeId, nid('1C 1D 1H'));
});

test('legacy array import and legacy export mode remain supported', () => {
  const legacyYaml = `
- id: "1C"
  context:
    sequence: ["1C"]
  meaning:
    type: opening
`;
  useBiddingStore.getState().importYaml(legacyYaml);
  assert.equal(!!useBiddingStore.getState().nodes[nid('1C')], true);
  assert.equal(Object.keys(useBiddingStore.getState().sectionsById).length, 0);

  const legacyOut = useBiddingStore.getState().exportYaml({ legacy: true });
  const parsedLegacy = yaml.load(legacyOut);
  assert.equal(Array.isArray(parsedLegacy), true);
});
