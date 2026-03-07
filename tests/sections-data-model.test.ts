import test from 'node:test';
import assert from 'node:assert/strict';
import { useBiddingStore } from '../store/useBiddingStore';

const baseline = useBiddingStore.getState();

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resetStoreState(): void {
  useBiddingStore.setState(
    {
      ...baseline,
      nodes: deepCopy(baseline.nodes),
      selectedNodeId: null,
      sectionsById: {},
      sectionRootOrder: [],
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
