import { create } from 'zustand';
import yaml from 'js-yaml';
import {
  buildSequenceIdFromSteps,
  canonicalizeNodeId,
  normalizeBiddingCall,
  normalizeBiddingStep,
  normalizeStepSequence,
  parseSequenceIdToSteps,
  toLegacyCallSequence,
  type BiddingActor,
  type BiddingStep,
} from '@/lib/bidding-steps';
import { compareStepSequences } from '@/lib/utils';

export interface BiddingNode {
  id: string;
  context: {
    sequence: BiddingStep[];
  };
  meaning?: {
    type?: string;
    forcing?: string;
    natural?: boolean;
    alert?: boolean;
    hcp?: {
      min?: number | string;
      max?: number | string;
    };
    shape?: {
      S?: string;
      H?: string;
      D?: string;
      C?: string;
      balanced?: boolean;
      patterns?: string[];
      constraints?: string[];
    };
    shows?: string[];
    notes?: string;
    accepted?: boolean;
    comments?: {
      text: string;
      author: string;
      timestamp: string;
    }[];
  };
  // UI state
  isExpanded?: boolean;
  isBookmarked?: boolean;
}

export type LeftPrimaryMode = 'roots' | 'sections' | 'smartViews';
export type EditorTreeViewMode = 'classic' | 'compact';

export interface SectionRecord {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionTreeNode {
  section: SectionRecord;
  children: SectionTreeNode[];
}

export interface SectionMutationResult {
  ok: boolean;
  sectionId?: string;
  error?: string;
}

export interface SubtreeRuleRecord {
  id: string;
  sectionId: string;
  rootNodeId: string;
  includeFutureDescendants: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentMutationResult {
  ok: boolean;
  ruleId?: string;
  error?: string;
}

export type BuiltInSmartViewId =
  | 'sv_unassigned'
  | 'sv_bookmarked'
  | 'sv_no_notes'
  | 'sv_unaccepted'
  | 'sv_recently_edited'
  | 'sv_competitive_only'
  | 'sv_has_opponent_action';

export type CustomSmartViewField = 'all' | 'sequence' | 'notes' | 'shows';

export interface CustomSmartViewRecord {
  id: string;
  name: string;
  query: string;
  field: CustomSmartViewField;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SmartViewDescriptor {
  id: string;
  name: string;
  isBuiltIn: boolean;
  builtInId?: BuiltInSmartViewId;
  query?: string;
  field?: CustomSmartViewField;
  isPinned: boolean;
  order: number;
}

export interface SmartViewMutationResult {
  ok: boolean;
  smartViewId?: string;
  error?: string;
}

export interface RootEntryMutationResult {
  ok: boolean;
  nodeId?: string;
  error?: string;
}

export interface BatchMutationResult {
  ok: boolean;
  updatedCount?: number;
  error?: string;
}

interface DraftPayload {
  version: number;
  savedAt: string;
  nodes: Record<string, BiddingNode>;
  selectedNodeId: string | null;
  rootEntryNodeIds?: string[];
  activeRootEntryNodeId?: string | null;
  sectionsById?: Record<string, SectionRecord>;
  sectionRootOrder?: string[];
  nodeSectionIds?: Record<string, string[]>;
  subtreeRulesById?: Record<string, SubtreeRuleRecord>;
  customSmartViewsById?: Record<string, CustomSmartViewRecord>;
  customSmartViewOrder?: string[];
  smartViewPinnedById?: Record<string, boolean>;
  nodeTouchedAtById?: Record<string, string>;
  sectionExpandedById?: Record<string, boolean>;
  leftPrimaryMode?: LeftPrimaryMode;
  activeSectionId?: string | null;
  activeSmartViewId?: string | null;
  searchQuery?: string;
  isLeftPanelOpen?: boolean;
  isRightPanelOpen?: boolean;
  treeViewMode?: EditorTreeViewMode;
}

interface EditorHistorySnapshot {
  nodes: Record<string, BiddingNode>;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  rootEntryNodeIds: string[];
  activeRootEntryNodeId: string | null;
  sectionsById: Record<string, SectionRecord>;
  sectionRootOrder: string[];
  nodeSectionIds: Record<string, string[]>;
  subtreeRulesById: Record<string, SubtreeRuleRecord>;
  customSmartViewsById: Record<string, CustomSmartViewRecord>;
  customSmartViewOrder: string[];
  smartViewPinnedById: Record<string, boolean>;
  nodeTouchedAtById: Record<string, string>;
  sectionExpandedById: Record<string, boolean>;
  leftPrimaryMode: LeftPrimaryMode;
  activeSectionId: string | null;
  activeSmartViewId: string | null;
}

interface ExportSchemaV2 {
  schemaVersion: number;
  exportedAt: string;
  nodes: BiddingNode[];
  rootEntryNodeIds: string[];
  activeRootEntryNodeId: string | null;
  sectionsById: Record<string, SectionRecord>;
  sectionRootOrder: string[];
  nodeSectionIds: Record<string, string[]>;
  subtreeRulesById: Record<string, SubtreeRuleRecord>;
  customSmartViewsById: Record<string, CustomSmartViewRecord>;
  customSmartViewOrder: string[];
  smartViewPinnedById: Record<string, boolean>;
  nodeTouchedAtById: Record<string, string>;
  leftPrimaryMode: LeftPrimaryMode;
  activeSectionId: string | null;
  activeSmartViewId: string | null;
}

interface BiddingState {
  nodes: Record<string, BiddingNode>;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  rootEntryNodeIds: string[];
  activeRootEntryNodeId: string | null;
  sectionsById: Record<string, SectionRecord>;
  sectionRootOrder: string[];
  nodeSectionIds: Record<string, string[]>;
  subtreeRulesById: Record<string, SubtreeRuleRecord>;
  customSmartViewsById: Record<string, CustomSmartViewRecord>;
  customSmartViewOrder: string[];
  smartViewPinnedById: Record<string, boolean>;
  nodeTouchedAtById: Record<string, string>;
  sectionExpandedById: Record<string, boolean>;
  leftPrimaryMode: LeftPrimaryMode;
  activeSectionId: string | null;
  activeSmartViewId: string | null;
  activeSystemId: string | null;
  activeSystemRevision: number | null;
  searchQuery: string;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  treeViewMode: EditorTreeViewMode;
  hasUnsavedChanges: boolean;
  isDraftSaving: boolean;
  isServerSyncing: boolean;
  serverSyncError: string | null;
  lastDraftSavedAt: string | null;
  lastServerSavedAt: string | null;
  lastExportedAt: string | null;
  undoStack: EditorHistorySnapshot[];
  redoStack: EditorHistorySnapshot[];
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  importYaml: (yamlString: string) => void;
  exportYaml: (options?: { legacy?: boolean }) => string;
  addNode: (parentId: string | null, call: string, actor?: BiddingActor) => void;
  updateNode: (id: string, updates: Partial<BiddingNode>) => void;
  renameNode: (id: string, newCall: string) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  toggleNodeSelection: (id: string) => void;
  setNodeSelection: (nodeIds: string[]) => void;
  clearNodeSelection: () => void;
  toggleExpand: (id: string) => void;
  setSearchQuery: (query: string) => void;
  toggleBookmark: (id: string) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setTreeViewMode: (mode: EditorTreeViewMode) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToDepth: (depth: number) => void;
  setActiveSystem: (systemId: string | null, revision?: number | null) => void;
  hydrateFromRemoteSystem: (input: {
    systemId: string;
    revision: number;
    nodes: Array<{ sequenceId: string; payload: unknown }>;
  }) => void;
  markServerSyncStarted: () => void;
  markServerSyncSuccess: (revision: number, clearUnsaved?: boolean) => void;
  markServerSyncError: (message: string) => void;
  markUnsavedChanges: () => void;
  createSection: (name: string, parentId?: string | null) => SectionMutationResult;
  renameSection: (sectionId: string, name: string) => SectionMutationResult;
  moveSection: (sectionId: string, targetParentId: string | null, targetIndex?: number) => SectionMutationResult;
  reorderSection: (sectionId: string, targetIndex: number) => SectionMutationResult;
  deleteSection: (sectionId: string) => SectionMutationResult;
  assignNodeToSection: (nodeId: string, sectionId: string) => AssignmentMutationResult;
  unassignNodeFromSection: (nodeId: string, sectionId: string) => AssignmentMutationResult;
  setNodeSections: (nodeId: string, sectionIds: string[]) => AssignmentMutationResult;
  createSubtreeRule: (
    sectionId: string,
    rootNodeId: string,
    includeFutureDescendants?: boolean,
  ) => AssignmentMutationResult;
  deleteSubtreeRule: (ruleId: string) => AssignmentMutationResult;
  createCustomSmartView: (
    name: string,
    query: string,
    field?: CustomSmartViewField,
  ) => SmartViewMutationResult;
  updateCustomSmartView: (
    smartViewId: string,
    input: { name?: string; query?: string; field?: CustomSmartViewField },
  ) => SmartViewMutationResult;
  deleteCustomSmartView: (smartViewId: string) => SmartViewMutationResult;
  toggleSmartViewPinned: (smartViewId: string) => SmartViewMutationResult;
  setLeftPrimaryMode: (mode: LeftPrimaryMode) => void;
  addRootEntry: (nodeId: string) => RootEntryMutationResult;
  removeRootEntry: (nodeId: string) => RootEntryMutationResult;
  batchAssignNodesToSection: (nodeIds: string[], sectionId: string) => BatchMutationResult;
  batchSetBookmarks: (nodeIds: string[], bookmarked: boolean) => BatchMutationResult;
  batchSetRootEntries: (nodeIds: string[], enabled: boolean) => BatchMutationResult;
  batchSetAccepted: (nodeIds: string[], accepted: boolean) => BatchMutationResult;
  setActiveRootEntryNodeId: (nodeId: string | null) => void;
  setActiveSectionId: (sectionId: string | null) => void;
  setActiveSmartViewId: (smartViewId: string | null) => void;
  toggleSectionExpanded: (sectionId: string) => void;
  setSectionExpanded: (sectionId: string, expanded: boolean) => void;
  getSectionChildren: (parentId: string | null) => SectionRecord[];
  getSectionTree: () => SectionTreeNode[];
  getSectionPath: (sectionId: string) => SectionRecord[];
  getSectionNodeCount: (sectionId: string) => number;
  getEffectiveSectionIds: (nodeId: string) => string[];
  getSubtreeRulesForNode: (nodeId: string) => SubtreeRuleRecord[];
  getPrimaryMatchedNodeIds: () => string[];
  getDisplayNodeIdsWithAncestors: () => string[];
  getSmartViews: () => SmartViewDescriptor[];
  evalSmartView: (nodeId: string, smartViewId: string) => boolean;
  getSmartViewCount: (smartViewId: string) => number;
  undo: () => void;
  redo: () => void;
  flushDraftSave: () => void;
  clearDraft: () => void;
}

const DRAFT_STORAGE_KEY = 'bridge-system-editor:draft:v1';
const DRAFT_VERSION = 1;
const DRAFT_SAVE_DEBOUNCE_MS = 900;
const EXPORT_SCHEMA_VERSION = 2;
const SECTION_NAME_MAX_LENGTH = 64;
const SMART_VIEW_NAME_MAX_LENGTH = 64;
const SMART_VIEW_QUERY_MAX_LENGTH = 160;
const RECENTLY_EDITED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_LIMIT = 120;
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

const BUILTIN_SMART_VIEWS: Array<{ id: BuiltInSmartViewId; name: string; order: number }> = [
  { id: 'sv_unassigned', name: 'Unassigned', order: 0 },
  { id: 'sv_bookmarked', name: 'Bookmarked', order: 1 },
  { id: 'sv_no_notes', name: 'No notes', order: 2 },
  { id: 'sv_unaccepted', name: 'Unaccepted', order: 3 },
  { id: 'sv_recently_edited', name: 'Recently edited', order: 4 },
  { id: 'sv_competitive_only', name: 'Competitive only', order: 5 },
  { id: 'sv_has_opponent_action', name: 'Has opponent action', order: 6 },
];
const SECTION_ROOT_KEY = '__root__';

function clampIndex(index: number, max: number): number {
  if (!Number.isFinite(index)) return max;
  if (index < 0) return 0;
  if (index > max) return max;
  return Math.floor(index);
}

function normalizeSectionName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function sectionParentKey(parentId: string | null): string {
  return parentId ?? SECTION_ROOT_KEY;
}

function hasSectionNameConflict(
  sectionsById: Record<string, SectionRecord>,
  parentId: string | null,
  normalizedName: string,
  excludeId?: string,
): boolean {
  const compareName = normalizedName.toLocaleLowerCase();
  return Object.values(sectionsById).some((section) => {
    if (section.parentId !== parentId) return false;
    if (excludeId && section.id === excludeId) return false;
    return section.name.toLocaleLowerCase() === compareName;
  });
}

function getSiblingIdsSorted(
  sectionsById: Record<string, SectionRecord>,
  parentId: string | null,
): string[] {
  return Object.values(sectionsById)
    .filter((section) => section.parentId === parentId)
    .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((section) => section.id);
}

function applySiblingOrder(
  sectionsById: Record<string, SectionRecord>,
  parentId: string | null,
  orderedIds: string[],
): Record<string, SectionRecord> {
  const nextSections = { ...sectionsById };
  orderedIds.forEach((id, index) => {
    const section = nextSections[id];
    if (!section) return;
    nextSections[id] = {
      ...section,
      parentId,
      order: index,
    };
  });
  return nextSections;
}

function getSectionRootOrder(sectionsById: Record<string, SectionRecord>): string[] {
  return getSiblingIdsSorted(sectionsById, null);
}

function isDescendantSection(
  sectionsById: Record<string, SectionRecord>,
  rootId: string,
  candidateParentId: string | null,
): boolean {
  if (!candidateParentId) return false;
  let cursor: string | null = candidateParentId;
  while (cursor) {
    if (cursor === rootId) return true;
    cursor = sectionsById[cursor]?.parentId ?? null;
  }
  return false;
}

function buildSectionTreeFromChildMap(
  sectionsById: Record<string, SectionRecord>,
  sectionChildIdsByParentId: Record<string, string[]>,
  parentId: string | null,
): SectionTreeNode[] {
  const siblingIds = sectionChildIdsByParentId[sectionParentKey(parentId)] ?? [];
  return siblingIds
    .map((sectionId) => sectionsById[sectionId])
    .filter((section): section is SectionRecord => !!section)
    .map((section) => ({
      section,
      children: buildSectionTreeFromChildMap(sectionsById, sectionChildIdsByParentId, section.id),
    }));
}

function buildSectionPath(
  sectionsById: Record<string, SectionRecord>,
  sectionId: string,
): SectionRecord[] {
  const path: SectionRecord[] = [];
  const visited = new Set<string>();
  let cursor: string | null = sectionId;
  while (cursor) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const section: SectionRecord | undefined = sectionsById[cursor];
    if (!section) break;
    path.push(section);
    cursor = section.parentId;
  }
  return path.reverse();
}

function nextSectionId(sectionsById: Record<string, SectionRecord>): string {
  let id = '';
  do {
    id = `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  } while (sectionsById[id]);
  return id;
}

function nextSubtreeRuleId(rulesById: Record<string, SubtreeRuleRecord>): string {
  let id = '';
  do {
    id = `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  } while (rulesById[id]);
  return id;
}

function normalizeSectionIdList(sectionIds: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  sectionIds.forEach((sectionId) => {
    const trimmed = sectionId.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    normalized.push(trimmed);
  });
  return normalized;
}

function isNodeWithinSubtree(nodeId: string, rootNodeId: string): boolean {
  if (nodeId === rootNodeId) return true;
  return nodeId.startsWith(`${rootNodeId} `);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createHistorySnapshot(state: BiddingState): EditorHistorySnapshot {
  return deepClone({
    nodes: state.nodes,
    selectedNodeId: state.selectedNodeId,
    selectedNodeIds: state.selectedNodeIds,
    rootEntryNodeIds: state.rootEntryNodeIds,
    activeRootEntryNodeId: state.activeRootEntryNodeId,
    sectionsById: state.sectionsById,
    sectionRootOrder: state.sectionRootOrder,
    nodeSectionIds: state.nodeSectionIds,
    subtreeRulesById: state.subtreeRulesById,
    customSmartViewsById: state.customSmartViewsById,
    customSmartViewOrder: state.customSmartViewOrder,
    smartViewPinnedById: state.smartViewPinnedById,
    nodeTouchedAtById: state.nodeTouchedAtById,
    sectionExpandedById: state.sectionExpandedById,
    leftPrimaryMode: state.leftPrimaryMode,
    activeSectionId: state.activeSectionId,
    activeSmartViewId: state.activeSmartViewId,
  });
}

function applyHistorySnapshot(snapshot: EditorHistorySnapshot): Partial<BiddingState> {
  const next = deepClone(snapshot);
  return {
    nodes: next.nodes,
    selectedNodeId: next.selectedNodeId,
    selectedNodeIds: next.selectedNodeIds,
    rootEntryNodeIds: next.rootEntryNodeIds,
    activeRootEntryNodeId: next.activeRootEntryNodeId,
    sectionsById: next.sectionsById,
    sectionRootOrder: next.sectionRootOrder,
    nodeSectionIds: next.nodeSectionIds,
    subtreeRulesById: next.subtreeRulesById,
    customSmartViewsById: next.customSmartViewsById,
    customSmartViewOrder: next.customSmartViewOrder,
    smartViewPinnedById: next.smartViewPinnedById,
    nodeTouchedAtById: next.nodeTouchedAtById,
    sectionExpandedById: next.sectionExpandedById,
    leftPrimaryMode: next.leftPrimaryMode,
    activeSectionId: next.activeSectionId,
    activeSmartViewId: next.activeSmartViewId,
  };
}

function pushUndoStack(
  stack: EditorHistorySnapshot[],
  snapshot: EditorHistorySnapshot,
): EditorHistorySnapshot[] {
  const next = [...stack, snapshot];
  if (next.length > HISTORY_LIMIT) {
    next.splice(0, next.length - HISTORY_LIMIT);
  }
  return next;
}

function sortNodeIdsBySequence(
  nodeIds: string[],
  nodes: Record<string, BiddingNode>,
): string[] {
  return [...nodeIds].sort((nodeIdA, nodeIdB) => {
    const nodeA = nodes[nodeIdA];
    const nodeB = nodes[nodeIdB];
    if (!nodeA && !nodeB) return nodeIdA.localeCompare(nodeIdB);
    if (!nodeA) return 1;
    if (!nodeB) return -1;
    return compareStepSequences(nodeA.context.sequence, nodeB.context.sequence)
      || nodeIdA.localeCompare(nodeIdB);
  });
}

function getDefaultRootEntryNodeIds(nodes: Record<string, BiddingNode>): string[] {
  const depthOneIds = Object.values(nodes)
    .filter((node) => node.context.sequence.length === 1)
    .map((node) => node.id);
  return sortNodeIdsBySequence(depthOneIds, nodes);
}

function normalizeRootEntryNodeIds(
  rawRootEntryNodeIds: unknown,
  nodes: Record<string, BiddingNode>,
  warnings: string[],
): string[] {
  if (!Array.isArray(rawRootEntryNodeIds)) {
    return getDefaultRootEntryNodeIds(nodes);
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  let dropped = 0;
  rawRootEntryNodeIds.forEach((rawNodeId) => {
    if (typeof rawNodeId !== 'string') {
      dropped += 1;
      return;
    }
    const canonicalNodeId = canonicalizeNodeId(rawNodeId);
    if (!canonicalNodeId || !nodes[canonicalNodeId] || seen.has(canonicalNodeId)) {
      dropped += 1;
      return;
    }
    seen.add(canonicalNodeId);
    normalized.push(canonicalNodeId);
  });

  if (dropped > 0) {
    warnings.push(`dropped ${dropped} invalid root entry reference(s)`);
  }
  if (normalized.length === 0) {
    return getDefaultRootEntryNodeIds(nodes);
  }
  return sortNodeIdsBySequence(normalized, nodes);
}

function remapNodeIdMapForRename<T>(
  map: Record<string, T>,
  oldRootNodeId: string,
  newRootNodeId: string,
): Record<string, T> {
  const nextMap: Record<string, T> = {};
  const oldPrefix = `${oldRootNodeId} `;
  const newPrefix = `${newRootNodeId} `;
  Object.entries(map).forEach(([nodeId, value]) => {
    if (nodeId === oldRootNodeId) {
      nextMap[newRootNodeId] = value;
      return;
    }
    if (nodeId.startsWith(oldPrefix)) {
      const suffix = nodeId.slice(oldPrefix.length);
      nextMap[`${newPrefix}${suffix}`] = value;
      return;
    }
    nextMap[nodeId] = value;
  });
  return nextMap;
}

function remapNodeIdListForRename(
  nodeIds: string[],
  oldRootNodeId: string,
  newRootNodeId: string,
): string[] {
  const oldPrefix = `${oldRootNodeId} `;
  const newPrefix = `${newRootNodeId} `;
  return nodeIds.map((nodeId) => {
    if (nodeId === oldRootNodeId) return newRootNodeId;
    if (!nodeId.startsWith(oldPrefix)) return nodeId;
    const suffix = nodeId.slice(oldPrefix.length);
    return `${newPrefix}${suffix}`;
  });
}

function normalizeSmartViewName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function normalizeSmartViewQuery(input: string): string {
  return input.trim();
}

function nextCustomSmartViewId(customSmartViewsById: Record<string, CustomSmartViewRecord>): string {
  let id = '';
  do {
    id = `sv_custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  } while (customSmartViewsById[id]);
  return id;
}

function buildNodeTextForSmartQuery(node: BiddingNode, field: CustomSmartViewField): string {
  const sequenceText = node.context.sequence.map((step) => (
    step.actor === 'opp' ? `(${step.call})` : step.call
  )).join(' ');
  const notesText = node.meaning?.notes || '';
  const showsText = node.meaning?.shows?.join(' ') || '';
  switch (field) {
    case 'sequence':
      return sequenceText;
    case 'notes':
      return notesText;
    case 'shows':
      return showsText;
    default:
      return `${sequenceText} ${notesText} ${showsText}`.trim();
  }
}

function matchesCustomSmartViewQuery(node: BiddingNode, query: string, field: CustomSmartViewField): boolean {
  const normalizedQuery = normalizeSmartViewQuery(query).toLocaleLowerCase();
  if (!normalizedQuery) return false;
  const haystack = buildNodeTextForSmartQuery(node, field).toLocaleLowerCase();
  return haystack.includes(normalizedQuery);
}

function isBuiltInSmartViewId(value: string): value is BuiltInSmartViewId {
  return BUILTIN_SMART_VIEWS.some((item) => item.id === value);
}

function getEffectiveSectionIdsForNode(
  nodeId: string,
  nodeSectionIds: Record<string, string[]>,
  subtreeRulesById: Record<string, SubtreeRuleRecord>,
  sectionsById?: Record<string, SectionRecord>,
): string[] {
  const direct = (nodeSectionIds[nodeId] ?? [])
    .filter((sectionId) => (sectionsById ? !!sectionsById[sectionId] : true));
  const fromRules = Object.values(subtreeRulesById)
    .filter((rule) => {
      if (sectionsById && !sectionsById[rule.sectionId]) return false;
      if (rule.rootNodeId === nodeId) return true;
      if (!rule.includeFutureDescendants) return false;
      return isNodeWithinSubtree(nodeId, rule.rootNodeId);
    })
    .map((rule) => rule.sectionId);
  return normalizeSectionIdList([...direct, ...fromRules]);
}

function buildSmartViews(
  customSmartViewsById: Record<string, CustomSmartViewRecord>,
  customSmartViewOrder: string[],
  smartViewPinnedById: Record<string, boolean>,
): SmartViewDescriptor[] {
  const builtIns = BUILTIN_SMART_VIEWS.map((item) => ({
    id: item.id,
    name: item.name,
    isBuiltIn: true,
    builtInId: item.id,
    isPinned: !!smartViewPinnedById[item.id],
    order: item.order,
  })) satisfies SmartViewDescriptor[];

  const customIds = customSmartViewOrder.filter((id) => !!customSmartViewsById[id]);
  const customDescriptors = customIds.map((smartViewId, index) => {
    const item = customSmartViewsById[smartViewId];
    return {
      id: item.id,
      name: item.name,
      isBuiltIn: false,
      query: item.query,
      field: item.field,
      isPinned: !!smartViewPinnedById[item.id],
      order: Number.isFinite(item.order) ? item.order : index,
    } satisfies SmartViewDescriptor;
  });

  return [...builtIns, ...customDescriptors].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}

function evalSmartViewById(
  nodeId: string,
  smartViewId: string,
  state: Pick<
    BiddingState,
    'nodes'
    | 'nodeSectionIds'
    | 'subtreeRulesById'
    | 'nodeTouchedAtById'
    | 'customSmartViewsById'
  > & {
    effectiveSectionIdsByNode?: Record<string, string[]>;
  },
): boolean {
  const node = state.nodes[nodeId];
  if (!node) return false;

  if (isBuiltInSmartViewId(smartViewId)) {
    if (smartViewId === 'sv_unassigned') {
      const effectiveSectionIds = state.effectiveSectionIdsByNode?.[nodeId]
        ?? getEffectiveSectionIdsForNode(nodeId, state.nodeSectionIds, state.subtreeRulesById);
      return effectiveSectionIds.length === 0;
    }
    if (smartViewId === 'sv_bookmarked') {
      return !!node.isBookmarked;
    }
    if (smartViewId === 'sv_no_notes') {
      const notes = node.meaning?.notes ?? '';
      return !notes.trim();
    }
    if (smartViewId === 'sv_unaccepted') {
      return !node.meaning?.accepted;
    }
    if (smartViewId === 'sv_recently_edited') {
      const touchedAt = state.nodeTouchedAtById[nodeId];
      if (!touchedAt) return false;
      const touchedMs = new Date(touchedAt).getTime();
      if (Number.isNaN(touchedMs)) return false;
      return Date.now() - touchedMs <= RECENTLY_EDITED_WINDOW_MS;
    }
    if (smartViewId === 'sv_has_opponent_action') {
      return node.context.sequence.some((step) => step.actor === 'opp');
    }
    if (smartViewId === 'sv_competitive_only') {
      const hasOur = node.context.sequence.some((step) => step.actor === 'our');
      const hasOpp = node.context.sequence.some((step) => step.actor === 'opp');
      return hasOur && hasOpp;
    }
    return false;
  }

  const custom = state.customSmartViewsById[smartViewId];
  if (!custom) return false;
  return matchesCustomSmartViewQuery(node, custom.query, custom.field);
}

function buildDisplayNodeIdsWithAncestors(
  matchedNodeIds: string[],
  nodes: Record<string, BiddingNode>,
): string[] {
  const displayIds = new Set<string>();
  matchedNodeIds.forEach((nodeId) => {
    const sequence = nodeId.split(' ').filter(Boolean);
    for (let i = 1; i <= sequence.length; i += 1) {
      const ancestorId = sequence.slice(0, i).join(' ');
      if (nodes[ancestorId]) {
        displayIds.add(ancestorId);
      }
    }
  });
  return Array.from(displayIds);
}

interface DerivedIndexes {
  rulesByRootNodeId: Record<string, SubtreeRuleRecord[]>;
  nodeParentById: Record<string, string | null>;
  sectionChildIdsByParentId: Record<string, string[]>;
  effectiveSectionIdsByNode: Record<string, string[]>;
  sectionNodeCountBySectionId: Record<string, number>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeImportedNodes(rawNodes: unknown, warnings: string[]): Record<string, BiddingNode> {
  if (!Array.isArray(rawNodes)) {
    warnings.push('nodes payload is not an array; using empty nodes set');
    return {};
  }

  const nodes: Record<string, BiddingNode> = {};
  let dropped = 0;

  rawNodes.forEach((rawNode) => {
    if (!isPlainRecord(rawNode)) {
      dropped += 1;
      return;
    }

    const rawContext = isPlainRecord(rawNode.context) ? rawNode.context : {};
    const rawSequence = normalizeStepSequence(rawContext.sequence);
    const fallbackId = typeof rawNode.id === 'string' ? rawNode.id.trim() : '';
    const fallbackSequence = fallbackId ? parseSequenceIdToSteps(fallbackId) : [];
    const sequence = rawSequence.length > 0 ? rawSequence : fallbackSequence;
    if (sequence.length === 0) {
      dropped += 1;
      return;
    }

    const id = buildSequenceIdFromSteps(sequence);
    const rawIsExpanded = typeof rawNode.isExpanded === 'boolean' ? rawNode.isExpanded : sequence.length <= 2;
    const rawIsBookmarked = typeof rawNode.isBookmarked === 'boolean' ? rawNode.isBookmarked : false;

    const normalizedNode: BiddingNode = {
      ...(rawNode as Partial<BiddingNode>),
      id,
      context: { sequence },
      isExpanded: rawIsExpanded,
      isBookmarked: rawIsBookmarked,
    };

    nodes[id] = normalizedNode;
  });

  if (dropped > 0) {
    warnings.push(`dropped ${dropped} invalid node record(s)`);
  }

  return nodes;
}

function normalizeImportedV2Payload(
  input: Record<string, unknown>,
  warnings: string[],
): ExportSchemaV2 {
  const now = new Date().toISOString();
  const rawNodes = Array.isArray(input.nodes)
    ? input.nodes
    : isPlainRecord(input.data) && Array.isArray((input.data as Record<string, unknown>).nodes)
      ? (input.data as Record<string, unknown>).nodes
      : [];
  const nodes = normalizeImportedNodes(rawNodes, warnings);

  const rawSections: Record<string, unknown> = isPlainRecord(input.sectionsById)
    ? input.sectionsById
    : isPlainRecord(input.data) && isPlainRecord((input.data as Record<string, unknown>).sectionsById)
      ? ((input.data as Record<string, unknown>).sectionsById as Record<string, unknown>)
      : {};
  const sectionsById: Record<string, SectionRecord> = {};
  Object.entries(rawSections).forEach(([sectionId, rawSection]) => {
    if (!isPlainRecord(rawSection)) return;
    const name = normalizeSectionName(String(rawSection.name || ''));
    if (!name) return;
    sectionsById[sectionId] = {
      id: sectionId,
      name,
      parentId: typeof rawSection.parentId === 'string' && rawSection.parentId.trim().length > 0
        ? rawSection.parentId
        : null,
      order: Number.isFinite(rawSection.order) ? Number(rawSection.order) : 0,
      createdAt: typeof rawSection.createdAt === 'string' && rawSection.createdAt ? rawSection.createdAt : now,
      updatedAt: typeof rawSection.updatedAt === 'string' && rawSection.updatedAt ? rawSection.updatedAt : now,
    };
  });

  let rewiredParents = 0;
  Object.keys(sectionsById).forEach((sectionId) => {
    const section = sectionsById[sectionId];
    if (!section.parentId) return;
    if (!sectionsById[section.parentId] || section.parentId === section.id) {
      sectionsById[sectionId] = { ...section, parentId: null, updatedAt: now };
      rewiredParents += 1;
      return;
    }
    const visited = new Set<string>([section.id]);
    let cursor: string | null = section.parentId;
    while (cursor) {
      if (visited.has(cursor)) {
        sectionsById[sectionId] = { ...section, parentId: null, updatedAt: now };
        rewiredParents += 1;
        break;
      }
      visited.add(cursor);
      cursor = sectionsById[cursor]?.parentId ?? null;
    }
  });

  if (rewiredParents > 0) {
    warnings.push(`rewired ${rewiredParents} invalid section parent link(s) to root`);
  }

  let orderedSectionsById = { ...sectionsById };
  const parentIds = new Set<string | null>([null]);
  Object.values(orderedSectionsById).forEach((section) => parentIds.add(section.parentId));
  parentIds.forEach((parentId) => {
    const siblingIds = getSiblingIdsSorted(orderedSectionsById, parentId);
    orderedSectionsById = applySiblingOrder(orderedSectionsById, parentId, siblingIds);
  });

  const rawSectionRootOrder = Array.isArray(input.sectionRootOrder)
    ? input.sectionRootOrder
    : isPlainRecord(input.data) && Array.isArray((input.data as Record<string, unknown>).sectionRootOrder)
      ? (input.data as Record<string, unknown>).sectionRootOrder
      : [];
  const sectionRootOrder = Array.isArray(rawSectionRootOrder)
    ? rawSectionRootOrder
      .filter((sectionId): sectionId is string => typeof sectionId === 'string' && !!orderedSectionsById[sectionId])
    : [];
  const normalizedSectionRootOrder = sectionRootOrder.length > 0
    ? normalizeSectionIdList(sectionRootOrder)
    : getSectionRootOrder(orderedSectionsById);

  const rawNodeSectionIds: Record<string, unknown> = isPlainRecord(input.nodeSectionIds)
    ? input.nodeSectionIds
    : isPlainRecord(input.data) && isPlainRecord((input.data as Record<string, unknown>).nodeSectionIds)
      ? ((input.data as Record<string, unknown>).nodeSectionIds as Record<string, unknown>)
      : {};
  const nodeSectionIds: Record<string, string[]> = {};
  let droppedNodeSectionRefs = 0;
  Object.entries(rawNodeSectionIds).forEach(([rawNodeId, rawSectionIds]) => {
    const nodeId = canonicalizeNodeId(rawNodeId);
    if (!nodes[nodeId] || !Array.isArray(rawSectionIds)) return;
    const normalized = normalizeSectionIdList(
      rawSectionIds
        .filter((sectionId): sectionId is string => typeof sectionId === 'string')
        .filter((sectionId) => !!orderedSectionsById[sectionId]),
    );
    if (normalized.length !== rawSectionIds.length) {
      droppedNodeSectionRefs += rawSectionIds.length - normalized.length;
    }
    if (normalized.length > 0) {
      nodeSectionIds[nodeId] = normalized;
    }
  });

  const rawSubtreeRules: Record<string, unknown> = isPlainRecord(input.subtreeRulesById)
    ? input.subtreeRulesById
    : isPlainRecord(input.data) && isPlainRecord((input.data as Record<string, unknown>).subtreeRulesById)
      ? ((input.data as Record<string, unknown>).subtreeRulesById as Record<string, unknown>)
      : {};
  const subtreeRulesById: Record<string, SubtreeRuleRecord> = {};
  let droppedRules = 0;
  Object.entries(rawSubtreeRules).forEach(([ruleId, rawRule]) => {
    if (!isPlainRecord(rawRule)) {
      droppedRules += 1;
      return;
    }
    const sectionId = typeof rawRule.sectionId === 'string' ? rawRule.sectionId : '';
    const rootNodeId = typeof rawRule.rootNodeId === 'string'
      ? canonicalizeNodeId(rawRule.rootNodeId)
      : '';
    if (!sectionId || !rootNodeId || !orderedSectionsById[sectionId] || !nodes[rootNodeId]) {
      droppedRules += 1;
      return;
    }
    const createdAt = typeof rawRule.createdAt === 'string' && rawRule.createdAt ? rawRule.createdAt : now;
    subtreeRulesById[ruleId] = {
      id: ruleId,
      sectionId,
      rootNodeId,
      includeFutureDescendants: rawRule.includeFutureDescendants !== false,
      createdAt,
      updatedAt: typeof rawRule.updatedAt === 'string' && rawRule.updatedAt ? rawRule.updatedAt : createdAt,
    };
  });

  const rawCustomSmartViews: Record<string, unknown> = isPlainRecord(input.customSmartViewsById)
    ? input.customSmartViewsById
    : isPlainRecord(input.data) && isPlainRecord((input.data as Record<string, unknown>).customSmartViewsById)
      ? ((input.data as Record<string, unknown>).customSmartViewsById as Record<string, unknown>)
      : {};
  const customSmartViewsById: Record<string, CustomSmartViewRecord> = {};
  let droppedCustomViews = 0;
  Object.entries(rawCustomSmartViews).forEach(([smartViewId, rawSmartView]) => {
    if (!isPlainRecord(rawSmartView)) {
      droppedCustomViews += 1;
      return;
    }
    const name = normalizeSmartViewName(String(rawSmartView.name || ''));
    const query = normalizeSmartViewQuery(String(rawSmartView.query || ''));
    if (!name || !query) {
      droppedCustomViews += 1;
      return;
    }
    const field = rawSmartView.field === 'sequence' || rawSmartView.field === 'notes' || rawSmartView.field === 'shows'
      ? rawSmartView.field
      : 'all';
    const createdAt = typeof rawSmartView.createdAt === 'string' && rawSmartView.createdAt ? rawSmartView.createdAt : now;
    customSmartViewsById[smartViewId] = {
      id: smartViewId,
      name,
      query,
      field,
      order: Number.isFinite(rawSmartView.order) ? Number(rawSmartView.order) : 0,
      createdAt,
      updatedAt: typeof rawSmartView.updatedAt === 'string' && rawSmartView.updatedAt ? rawSmartView.updatedAt : createdAt,
    };
  });

  const rawCustomOrder: unknown[] = Array.isArray(input.customSmartViewOrder)
    ? input.customSmartViewOrder
    : isPlainRecord(input.data) && Array.isArray((input.data as Record<string, unknown>).customSmartViewOrder)
      ? ((input.data as Record<string, unknown>).customSmartViewOrder as unknown[])
      : [];
  const customSmartViewOrder = normalizeSectionIdList(
    rawCustomOrder.filter((smartViewId): smartViewId is string =>
      typeof smartViewId === 'string' && !!customSmartViewsById[smartViewId],
    ),
  );
  const orderedCustomIds = customSmartViewOrder.length > 0
    ? customSmartViewOrder
    : Object.values(customSmartViewsById)
      .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .map((item) => item.id);

  const rawPinned: Record<string, unknown> = isPlainRecord(input.smartViewPinnedById)
    ? input.smartViewPinnedById
    : isPlainRecord(input.data) && isPlainRecord((input.data as Record<string, unknown>).smartViewPinnedById)
      ? ((input.data as Record<string, unknown>).smartViewPinnedById as Record<string, unknown>)
      : {};
  const smartViewPinnedById: Record<string, boolean> = {};
  Object.entries(rawPinned).forEach(([smartViewId, pinned]) => {
    if (typeof pinned !== 'boolean') return;
    if (!isBuiltInSmartViewId(smartViewId) && !customSmartViewsById[smartViewId]) return;
    smartViewPinnedById[smartViewId] = pinned;
  });

  const rawTouched: Record<string, unknown> = isPlainRecord(input.nodeTouchedAtById)
    ? input.nodeTouchedAtById
    : isPlainRecord(input.data) && isPlainRecord((input.data as Record<string, unknown>).nodeTouchedAtById)
      ? ((input.data as Record<string, unknown>).nodeTouchedAtById as Record<string, unknown>)
      : {};
  const nodeTouchedAtById: Record<string, string> = {};
  Object.entries(rawTouched).forEach(([rawNodeId, touchedAt]) => {
    const nodeId = canonicalizeNodeId(rawNodeId);
    if (!nodes[nodeId] || typeof touchedAt !== 'string' || !touchedAt) return;
    nodeTouchedAtById[nodeId] = touchedAt;
  });

  if (droppedNodeSectionRefs > 0) {
    warnings.push(`dropped ${droppedNodeSectionRefs} invalid node-section reference(s)`);
  }
  if (droppedRules > 0) {
    warnings.push(`dropped ${droppedRules} invalid subtree rule(s)`);
  }
  if (droppedCustomViews > 0) {
    warnings.push(`dropped ${droppedCustomViews} invalid custom smart view(s)`);
  }

  const nestedData = isPlainRecord(input.data) ? input.data : {};
  const rawRootEntryNodeIds = Array.isArray(input.rootEntryNodeIds)
    ? input.rootEntryNodeIds
    : Array.isArray(nestedData.rootEntryNodeIds)
      ? nestedData.rootEntryNodeIds
      : [];
  const rootEntryNodeIds = normalizeRootEntryNodeIds(rawRootEntryNodeIds, nodes, warnings);
  const rawActiveRootEntryNodeId = typeof input.activeRootEntryNodeId === 'string'
    ? input.activeRootEntryNodeId
    : typeof nestedData.activeRootEntryNodeId === 'string'
      ? nestedData.activeRootEntryNodeId
      : null;
  const activeRootEntryNodeId = rawActiveRootEntryNodeId
    ? (() => {
      const canonicalNodeId = canonicalizeNodeId(rawActiveRootEntryNodeId);
      if (!nodes[canonicalNodeId]) return null;
      if (!rootEntryNodeIds.includes(canonicalNodeId)) return null;
      return canonicalNodeId;
    })()
    : null;
  const rawMode = typeof input.leftPrimaryMode === 'string'
    ? input.leftPrimaryMode
    : typeof nestedData.leftPrimaryMode === 'string'
      ? nestedData.leftPrimaryMode
      : undefined;
  const rawActiveSectionId = typeof input.activeSectionId === 'string'
    ? input.activeSectionId
    : typeof nestedData.activeSectionId === 'string'
      ? nestedData.activeSectionId
      : null;
  const rawActiveSmartViewId = typeof input.activeSmartViewId === 'string'
    ? input.activeSmartViewId
    : typeof nestedData.activeSmartViewId === 'string'
      ? nestedData.activeSmartViewId
      : null;
  const activeSectionId = rawActiveSectionId && orderedSectionsById[rawActiveSectionId] ? rawActiveSectionId : null;
  const activeSmartViewId = rawActiveSmartViewId
    && (isBuiltInSmartViewId(rawActiveSmartViewId) || !!customSmartViewsById[rawActiveSmartViewId])
    ? rawActiveSmartViewId
    : null;
  const leftPrimaryMode: LeftPrimaryMode =
    rawMode === 'sections' && activeSectionId
      ? 'sections'
      : rawMode === 'smartViews' && activeSmartViewId
        ? 'smartViews'
        : 'roots';

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: typeof input.exportedAt === 'string' && input.exportedAt ? input.exportedAt : now,
    nodes: Object.values(nodes),
    rootEntryNodeIds,
    activeRootEntryNodeId: activeRootEntryNodeId ?? rootEntryNodeIds[0] ?? null,
    sectionsById: orderedSectionsById,
    sectionRootOrder: normalizedSectionRootOrder,
    nodeSectionIds,
    subtreeRulesById,
    customSmartViewsById,
    customSmartViewOrder: orderedCustomIds,
    smartViewPinnedById,
    nodeTouchedAtById,
    leftPrimaryMode,
    activeSectionId,
    activeSmartViewId,
  };
}

function buildDerivedIndexes(
  nodes: Record<string, BiddingNode>,
  sectionsById: Record<string, SectionRecord>,
  nodeSectionIds: Record<string, string[]>,
  subtreeRulesById: Record<string, SubtreeRuleRecord>,
): DerivedIndexes {
  const sectionChildIdsByParentId: Record<string, string[]> = {};
  Object.values(sectionsById).forEach((section) => {
    const parentKey = sectionParentKey(section.parentId);
    if (!sectionChildIdsByParentId[parentKey]) {
      sectionChildIdsByParentId[parentKey] = [];
    }
    sectionChildIdsByParentId[parentKey].push(section.id);
  });
  Object.keys(sectionChildIdsByParentId).forEach((parentKey) => {
    sectionChildIdsByParentId[parentKey].sort((a, b) => {
      const sectionA = sectionsById[a];
      const sectionB = sectionsById[b];
      if (!sectionA || !sectionB) return a.localeCompare(b);
      return (sectionA.order - sectionB.order)
        || sectionA.name.localeCompare(sectionB.name)
        || sectionA.id.localeCompare(sectionB.id);
    });
  });

  const nodeIds = Object.keys(nodes);
  const nodeParentById: Record<string, string | null> = {};
  nodeIds.forEach((nodeId) => {
    const sequence = nodeId.split(' ').filter(Boolean);
    nodeParentById[nodeId] = sequence.length > 1 ? sequence.slice(0, -1).join(' ') : null;
  });

  const rulesByRootNodeId: Record<string, SubtreeRuleRecord[]> = {};
  Object.values(subtreeRulesById).forEach((rule) => {
    if (!sectionsById[rule.sectionId] || !nodes[rule.rootNodeId]) return;
    if (!rulesByRootNodeId[rule.rootNodeId]) {
      rulesByRootNodeId[rule.rootNodeId] = [];
    }
    rulesByRootNodeId[rule.rootNodeId].push(rule);
  });

  const effectiveSectionIdsByNode: Record<string, string[]> = {};
  const sectionNodeCountBySectionId: Record<string, number> = {};
  nodeIds.forEach((nodeId) => {
    const sectionIdsSet = new Set<string>();
    (nodeSectionIds[nodeId] ?? []).forEach((sectionId) => {
      if (sectionsById[sectionId]) sectionIdsSet.add(sectionId);
    });

    let cursor: string | null = nodeId;
    while (cursor) {
      const rules = rulesByRootNodeId[cursor] ?? [];
      rules.forEach((rule) => {
        if (cursor !== nodeId && !rule.includeFutureDescendants) return;
        sectionIdsSet.add(rule.sectionId);
      });
      cursor = nodeParentById[cursor] ?? null;
    }

    const sectionIds = Array.from(sectionIdsSet);
    effectiveSectionIdsByNode[nodeId] = sectionIds;
    sectionIds.forEach((sectionId) => {
      sectionNodeCountBySectionId[sectionId] = (sectionNodeCountBySectionId[sectionId] ?? 0) + 1;
    });
  });

  return {
    rulesByRootNodeId,
    nodeParentById,
    sectionChildIdsByParentId,
    effectiveSectionIdsByNode,
    sectionNodeCountBySectionId,
  };
}

const defaultSystem = `
- id: "1C"
  context:
    sequence: ["1C"]
  meaning:
    type: opening
    forcing: NF
    hcp:
      min: 12
      max: 21
    notes: "Base opening. Includes weak NT without major."
    accepted: true
- id: "1C 1D"
  context:
    sequence: ["1C", "1D"]
  meaning:
    type: response
    forcing: F1
    hcp:
      min: 5
      max: ""
- id: "1C 1D 1H"
  context:
    sequence: ["1C", "1D", "1H"]
  meaning:
    type: rebid
    forcing: NF
    hcp:
      min: 11
      max: 16
    accepted: true
- id: "1C 1D 1H 1S"
  context:
    sequence: ["1C", "1D", "1H", "1S"]
  meaning:
    type: response
    forcing: F1
    alert: true
    hcp:
      min: 10
      max: ""
    accepted: true
- id: "1C 1D 1H 1NT"
  context:
    sequence: ["1C", "1D", "1H", "1NT"]
  meaning:
    type: response
    forcing: NF
    hcp:
      min: 6
      max: 10
    shows:
      - "Weak/medium NT response without fit"
    notes: ""
- id: "1C 1D 1H 2D"
  context:
    sequence: ["1C", "1D", "1H", "2D"]
  meaning:
    type: response
    forcing: NF
    hcp:
      min: 5
      max: 9
`;

function parseDefaultNodes(): Record<string, BiddingNode> {
  const warnings: string[] = [];
  try {
    const parsed = yaml.load(defaultSystem);
    const normalized = normalizeImportedNodes(parsed, warnings);
    Object.values(normalized).forEach((node) => {
      normalized[node.id] = {
        ...node,
        isExpanded: true,
        isBookmarked: false,
      };
    });
    if (warnings.length > 0) {
      console.warn('[parseDefaultNodes] normalization warnings:', warnings);
    }
    return normalized;
  } catch (e) {
    console.error('Failed to parse default system', e);
    return {};
  }
}

function toNodeFromRemote(sequenceId: string, payload: unknown): BiddingNode {
  const fallbackSequence = parseSequenceIdToSteps(sequenceId);
  const payloadObj =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  const contextObj =
    payloadObj.context && typeof payloadObj.context === 'object' && !Array.isArray(payloadObj.context)
      ? (payloadObj.context as Record<string, unknown>)
      : {};

  const payloadSequence = normalizeStepSequence(contextObj.sequence);

  const sequence = payloadSequence.length > 0 ? payloadSequence : fallbackSequence;
  const nodeId = buildSequenceIdFromSteps(sequence);

  const baseNode = payloadObj as Partial<BiddingNode>;

  return {
    ...baseNode,
    id: nodeId,
    context: { sequence },
    isExpanded: typeof baseNode.isExpanded === 'boolean' ? baseNode.isExpanded : sequence.length <= 2,
    isBookmarked: typeof baseNode.isBookmarked === 'boolean' ? baseNode.isBookmarked : false,
  };
}

function loadDraftPayload(): DraftPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (typeof parsed?.version !== 'number' || parsed.version > DRAFT_VERSION) return null;
    if (!parsed.nodes || typeof parsed.nodes !== 'object') return null;
    return parsed;
  } catch (e) {
    console.error('Failed to read draft from localStorage', e);
    return null;
  }
}

function writeDraftPayload(payload: DraftPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save draft to localStorage', e);
  }
}

function removeDraftPayload(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear draft from localStorage', e);
  }
}

const initialDraft = loadDraftPayload();
const initialDraftWarnings: string[] = [];
const initialNodes = initialDraft?.nodes && Object.keys(initialDraft.nodes).length > 0
  ? normalizeImportedNodes(Object.values(initialDraft.nodes), initialDraftWarnings)
  : parseDefaultNodes();
if (initialDraftWarnings.length > 0) {
  console.warn('[loadDraftPayload] normalization warnings:', initialDraftWarnings);
}
const initialSectionsById = initialDraft?.sectionsById && typeof initialDraft.sectionsById === 'object'
  ? initialDraft.sectionsById
  : {};
const initialNodeSectionIdsRaw = initialDraft?.nodeSectionIds && typeof initialDraft.nodeSectionIds === 'object'
  ? initialDraft.nodeSectionIds
  : {};
const initialNodeSectionIds: Record<string, string[]> = {};
Object.entries(initialNodeSectionIdsRaw).forEach(([nodeId, sectionIds]) => {
  const canonicalNodeId = canonicalizeNodeId(nodeId);
  if (!initialNodes[canonicalNodeId] || !Array.isArray(sectionIds)) return;
  const normalized = normalizeSectionIdList(
    sectionIds.filter((sectionId): sectionId is string => typeof sectionId === 'string')
      .filter((sectionId) => !!initialSectionsById[sectionId]),
  );
  if (normalized.length > 0) {
    initialNodeSectionIds[canonicalNodeId] = normalized;
  }
});
const initialSubtreeRulesRaw = initialDraft?.subtreeRulesById && typeof initialDraft.subtreeRulesById === 'object'
  ? initialDraft.subtreeRulesById
  : {};
const initialSubtreeRulesById: Record<string, SubtreeRuleRecord> = {};
Object.entries(initialSubtreeRulesRaw).forEach(([ruleId, maybeRule]) => {
  const rule = maybeRule as Partial<SubtreeRuleRecord>;
  if (!rule || typeof rule !== 'object') return;
  if (!rule.sectionId || !initialSectionsById[rule.sectionId]) return;
  const canonicalRootNodeId = typeof rule.rootNodeId === 'string' ? canonicalizeNodeId(rule.rootNodeId) : '';
  if (!canonicalRootNodeId || !initialNodes[canonicalRootNodeId]) return;
  const timestamp = typeof rule.createdAt === 'string' && rule.createdAt ? rule.createdAt : new Date().toISOString();
  initialSubtreeRulesById[ruleId] = {
    id: ruleId,
    sectionId: rule.sectionId,
    rootNodeId: canonicalRootNodeId,
    includeFutureDescendants: rule.includeFutureDescendants !== false,
    createdAt: timestamp,
    updatedAt: typeof rule.updatedAt === 'string' && rule.updatedAt ? rule.updatedAt : timestamp,
  };
});
const initialCustomSmartViewsRaw = initialDraft?.customSmartViewsById && typeof initialDraft.customSmartViewsById === 'object'
  ? initialDraft.customSmartViewsById
  : {};
const initialCustomSmartViewsById: Record<string, CustomSmartViewRecord> = {};
Object.entries(initialCustomSmartViewsRaw).forEach(([smartViewId, maybeSmartView]) => {
  const smartView = maybeSmartView as Partial<CustomSmartViewRecord>;
  if (!smartView || typeof smartView !== 'object') return;
  const name = normalizeSmartViewName(String(smartView.name || ''));
  const query = normalizeSmartViewQuery(String(smartView.query || ''));
  const field: CustomSmartViewField = smartView.field === 'sequence' || smartView.field === 'notes' || smartView.field === 'shows'
    ? smartView.field
    : 'all';
  if (!name || !query) return;
  const createdAt = typeof smartView.createdAt === 'string' && smartView.createdAt ? smartView.createdAt : new Date().toISOString();
  initialCustomSmartViewsById[smartViewId] = {
    id: smartViewId,
    name,
    query,
    field,
    order: Number.isFinite(smartView.order) ? Number(smartView.order) : 0,
    createdAt,
    updatedAt: typeof smartView.updatedAt === 'string' && smartView.updatedAt ? smartView.updatedAt : createdAt,
  };
});
const initialCustomSmartViewOrder = initialDraft?.customSmartViewOrder && Array.isArray(initialDraft.customSmartViewOrder)
  ? initialDraft.customSmartViewOrder.filter((smartViewId) => !!initialCustomSmartViewsById[smartViewId])
  : Object.values(initialCustomSmartViewsById)
    .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((item) => item.id);
const builtInSmartViewIdSet = new Set(BUILTIN_SMART_VIEWS.map((item) => item.id));
const initialSmartViewPinnedRaw = initialDraft?.smartViewPinnedById && typeof initialDraft.smartViewPinnedById === 'object'
  ? initialDraft.smartViewPinnedById
  : {};
const initialSmartViewPinnedById: Record<string, boolean> = {};
Object.entries(initialSmartViewPinnedRaw).forEach(([smartViewId, pinned]) => {
  if (typeof pinned !== 'boolean') return;
  if (!builtInSmartViewIdSet.has(smartViewId as BuiltInSmartViewId) && !initialCustomSmartViewsById[smartViewId]) return;
  initialSmartViewPinnedById[smartViewId] = pinned;
});
const initialNodeTouchedRaw = initialDraft?.nodeTouchedAtById && typeof initialDraft.nodeTouchedAtById === 'object'
  ? initialDraft.nodeTouchedAtById
  : {};
const initialNodeTouchedAtById: Record<string, string> = {};
Object.entries(initialNodeTouchedRaw).forEach(([nodeId, touchedAt]) => {
  const canonicalNodeId = canonicalizeNodeId(nodeId);
  if (!initialNodes[canonicalNodeId] || typeof touchedAt !== 'string' || !touchedAt) return;
  initialNodeTouchedAtById[canonicalNodeId] = touchedAt;
});
const initialSectionRootOrder = initialDraft?.sectionRootOrder && Array.isArray(initialDraft.sectionRootOrder)
  ? initialDraft.sectionRootOrder.filter((sectionId) => !!initialSectionsById[sectionId])
  : getSectionRootOrder(initialSectionsById);
const initialRootEntryNodeIds = normalizeRootEntryNodeIds(
  initialDraft?.rootEntryNodeIds,
  initialNodes,
  initialDraftWarnings,
);
const initialActiveRootEntryNodeId = (() => {
  if (typeof initialDraft?.activeRootEntryNodeId === 'string') {
    const canonicalNodeId = canonicalizeNodeId(initialDraft.activeRootEntryNodeId);
    if (initialNodes[canonicalNodeId] && initialRootEntryNodeIds.includes(canonicalNodeId)) {
      return canonicalNodeId;
    }
  }
  if (initialRootEntryNodeIds.length > 0) return initialRootEntryNodeIds[0];
  return null;
})();
const initialLeftPrimaryModeRaw: LeftPrimaryMode = initialDraft?.leftPrimaryMode ?? 'roots';
const initialActiveSectionId = initialDraft?.activeSectionId && initialSectionsById[initialDraft.activeSectionId]
  ? initialDraft.activeSectionId
  : null;
const initialActiveSmartViewId = initialDraft?.activeSmartViewId
  && (builtInSmartViewIdSet.has(initialDraft.activeSmartViewId as BuiltInSmartViewId)
    || initialCustomSmartViewsById[initialDraft.activeSmartViewId])
  ? initialDraft.activeSmartViewId
  : null;
const initialSelectedNodeId = initialDraft?.selectedNodeId
  ? canonicalizeNodeId(initialDraft.selectedNodeId)
  : null;
const initialLeftPrimaryMode: LeftPrimaryMode =
  initialLeftPrimaryModeRaw === 'sections' && !initialActiveSectionId
    ? 'roots'
    : initialLeftPrimaryModeRaw === 'smartViews' && !initialActiveSmartViewId
      ? 'roots'
      : initialLeftPrimaryModeRaw;
const initialSectionExpandedByIdRaw = initialDraft?.sectionExpandedById
  && typeof initialDraft.sectionExpandedById === 'object'
  ? initialDraft.sectionExpandedById
  : {};
const initialSectionExpandedById: Record<string, boolean> = Object.fromEntries(
  Object.keys(initialSectionsById).map((sectionId) => {
    const draftValue = initialSectionExpandedByIdRaw[sectionId];
    return [sectionId, typeof draftValue === 'boolean' ? draftValue : true];
  }),
);
const initialSearchQuery = typeof initialDraft?.searchQuery === 'string'
  ? initialDraft.searchQuery
  : '';
const initialIsLeftPanelOpen = typeof initialDraft?.isLeftPanelOpen === 'boolean'
  ? initialDraft.isLeftPanelOpen
  : true;
const initialIsRightPanelOpen = typeof initialDraft?.isRightPanelOpen === 'boolean'
  ? initialDraft.isRightPanelOpen
  : true;
const initialTreeViewMode: EditorTreeViewMode =
  initialDraft?.treeViewMode === 'compact'
    ? 'compact'
    : 'classic';

export const useBiddingStore = create<BiddingState>((set, get) => {
  const queueDraftSave = () => {
    if (typeof window === 'undefined') return;

    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
    }

    set({ isDraftSaving: true });

    draftSaveTimer = setTimeout(() => {
      const state = get();
      const savedAt = new Date().toISOString();
      writeDraftPayload({
        version: DRAFT_VERSION,
        savedAt,
        nodes: state.nodes,
        selectedNodeId: state.selectedNodeId,
        rootEntryNodeIds: state.rootEntryNodeIds,
        activeRootEntryNodeId: state.activeRootEntryNodeId,
        sectionsById: state.sectionsById,
        sectionRootOrder: state.sectionRootOrder,
        nodeSectionIds: state.nodeSectionIds,
        subtreeRulesById: state.subtreeRulesById,
        customSmartViewsById: state.customSmartViewsById,
        customSmartViewOrder: state.customSmartViewOrder,
        smartViewPinnedById: state.smartViewPinnedById,
        nodeTouchedAtById: state.nodeTouchedAtById,
        sectionExpandedById: state.sectionExpandedById,
        leftPrimaryMode: state.leftPrimaryMode,
        activeSectionId: state.activeSectionId,
        activeSmartViewId: state.activeSmartViewId,
        searchQuery: state.searchQuery,
        isLeftPanelOpen: state.isLeftPanelOpen,
        isRightPanelOpen: state.isRightPanelOpen,
        treeViewMode: state.treeViewMode,
      });
      set({ isDraftSaving: false, lastDraftSavedAt: savedAt });
      draftSaveTimer = null;
    }, DRAFT_SAVE_DEBOUNCE_MS);
  };

  const flushDraftSave = () => {
    if (typeof window === 'undefined') return;

    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }

    const state = get();
    const savedAt = new Date().toISOString();
    writeDraftPayload({
      version: DRAFT_VERSION,
      savedAt,
      nodes: state.nodes,
      selectedNodeId: state.selectedNodeId,
      rootEntryNodeIds: state.rootEntryNodeIds,
      activeRootEntryNodeId: state.activeRootEntryNodeId,
      sectionsById: state.sectionsById,
      sectionRootOrder: state.sectionRootOrder,
      nodeSectionIds: state.nodeSectionIds,
      subtreeRulesById: state.subtreeRulesById,
      customSmartViewsById: state.customSmartViewsById,
      customSmartViewOrder: state.customSmartViewOrder,
      smartViewPinnedById: state.smartViewPinnedById,
      nodeTouchedAtById: state.nodeTouchedAtById,
      sectionExpandedById: state.sectionExpandedById,
      leftPrimaryMode: state.leftPrimaryMode,
      activeSectionId: state.activeSectionId,
      activeSmartViewId: state.activeSmartViewId,
      searchQuery: state.searchQuery,
      isLeftPanelOpen: state.isLeftPanelOpen,
      isRightPanelOpen: state.isRightPanelOpen,
      treeViewMode: state.treeViewMode,
    });
    set({ isDraftSaving: false, lastDraftSavedAt: savedAt });
  };

  let derivedIndexesCache: {
    nodesRef: Record<string, BiddingNode>;
    sectionsByIdRef: Record<string, SectionRecord>;
    nodeSectionIdsRef: Record<string, string[]>;
    subtreeRulesByIdRef: Record<string, SubtreeRuleRecord>;
    value: DerivedIndexes;
  } | null = null;

  const getDerivedIndexes = (state: BiddingState): DerivedIndexes => {
    if (
      derivedIndexesCache
      && derivedIndexesCache.nodesRef === state.nodes
      && derivedIndexesCache.sectionsByIdRef === state.sectionsById
      && derivedIndexesCache.nodeSectionIdsRef === state.nodeSectionIds
      && derivedIndexesCache.subtreeRulesByIdRef === state.subtreeRulesById
    ) {
      return derivedIndexesCache.value;
    }

    const value = buildDerivedIndexes(state.nodes, state.sectionsById, state.nodeSectionIds, state.subtreeRulesById);
    derivedIndexesCache = {
      nodesRef: state.nodes,
      sectionsByIdRef: state.sectionsById,
      nodeSectionIdsRef: state.nodeSectionIds,
      subtreeRulesByIdRef: state.subtreeRulesById,
      value,
    };
    return value;
  };

  let smartViewCountCache: {
    nodesRef: Record<string, BiddingNode>;
    nodeSectionIdsRef: Record<string, string[]>;
    subtreeRulesByIdRef: Record<string, SubtreeRuleRecord>;
    customSmartViewsByIdRef: Record<string, CustomSmartViewRecord>;
    nodeTouchedAtByIdRef: Record<string, string>;
    sectionsByIdRef: Record<string, SectionRecord>;
    nowMinute: number;
    value: Record<string, number>;
  } | null = null;

  const getSmartViewCountMap = (state: BiddingState): Record<string, number> => {
    const nowMinute = Math.floor(Date.now() / 60000);
    if (
      smartViewCountCache
      && smartViewCountCache.nodesRef === state.nodes
      && smartViewCountCache.nodeSectionIdsRef === state.nodeSectionIds
      && smartViewCountCache.subtreeRulesByIdRef === state.subtreeRulesById
      && smartViewCountCache.customSmartViewsByIdRef === state.customSmartViewsById
      && smartViewCountCache.nodeTouchedAtByIdRef === state.nodeTouchedAtById
      && smartViewCountCache.sectionsByIdRef === state.sectionsById
      && smartViewCountCache.nowMinute === nowMinute
    ) {
      return smartViewCountCache.value;
    }

    const derived = getDerivedIndexes(state);
    const counts: Record<string, number> = {};
    const nodeIds = Object.keys(state.nodes);
    const totalNodes = nodeIds.length;
    const assignedNodes = Object.values(derived.effectiveSectionIdsByNode).filter((sectionIds) => sectionIds.length > 0).length;
    counts.sv_unassigned = totalNodes - assignedNodes;
    counts.sv_bookmarked = nodeIds.reduce((acc, nodeId) => acc + (state.nodes[nodeId].isBookmarked ? 1 : 0), 0);
    counts.sv_no_notes = nodeIds.reduce((acc, nodeId) => {
      const notes = state.nodes[nodeId].meaning?.notes ?? '';
      return acc + (notes.trim() ? 0 : 1);
    }, 0);
    counts.sv_unaccepted = nodeIds.reduce((acc, nodeId) => acc + (state.nodes[nodeId].meaning?.accepted ? 0 : 1), 0);
    counts.sv_recently_edited = nodeIds.reduce((acc, nodeId) => {
      const touchedAt = state.nodeTouchedAtById[nodeId];
      if (!touchedAt) return acc;
      const touchedMs = new Date(touchedAt).getTime();
      if (Number.isNaN(touchedMs)) return acc;
      return acc + (Date.now() - touchedMs <= RECENTLY_EDITED_WINDOW_MS ? 1 : 0);
    }, 0);
    counts.sv_has_opponent_action = nodeIds.reduce((acc, nodeId) => (
      state.nodes[nodeId].context.sequence.some((step) => step.actor === 'opp') ? acc + 1 : acc
    ), 0);
    counts.sv_competitive_only = nodeIds.reduce((acc, nodeId) => {
      const sequence = state.nodes[nodeId].context.sequence;
      const hasOur = sequence.some((step) => step.actor === 'our');
      const hasOpp = sequence.some((step) => step.actor === 'opp');
      return hasOur && hasOpp ? acc + 1 : acc;
    }, 0);

    Object.values(state.customSmartViewsById).forEach((smartView) => {
      counts[smartView.id] = nodeIds.reduce((acc, nodeId) => (
        matchesCustomSmartViewQuery(state.nodes[nodeId], smartView.query, smartView.field) ? acc + 1 : acc
      ), 0);
    });

    smartViewCountCache = {
      nodesRef: state.nodes,
      nodeSectionIdsRef: state.nodeSectionIds,
      subtreeRulesByIdRef: state.subtreeRulesById,
      customSmartViewsByIdRef: state.customSmartViewsById,
      nodeTouchedAtByIdRef: state.nodeTouchedAtById,
      sectionsByIdRef: state.sectionsById,
      nowMinute,
      value: counts,
    };
    return counts;
  };

  const withHistoryMutation = (
    state: BiddingState,
    patch: Partial<BiddingState>,
  ): Partial<BiddingState> => {
    const nextUndoStack = pushUndoStack(state.undoStack, createHistorySnapshot(state));
    return {
      ...patch,
      undoStack: nextUndoStack,
      redoStack: [],
      canUndo: nextUndoStack.length > 0,
      canRedo: false,
    };
  };

  return {
    nodes: initialNodes,
    selectedNodeId: initialSelectedNodeId && initialNodes[initialSelectedNodeId] ? initialSelectedNodeId : null,
    selectedNodeIds: initialSelectedNodeId && initialNodes[initialSelectedNodeId] ? [initialSelectedNodeId] : [],
    rootEntryNodeIds: initialRootEntryNodeIds,
    activeRootEntryNodeId: initialActiveRootEntryNodeId,
    sectionsById: initialSectionsById,
    sectionRootOrder: initialSectionRootOrder,
    nodeSectionIds: initialNodeSectionIds,
    subtreeRulesById: initialSubtreeRulesById,
    customSmartViewsById: initialCustomSmartViewsById,
    customSmartViewOrder: initialCustomSmartViewOrder,
    smartViewPinnedById: initialSmartViewPinnedById,
    nodeTouchedAtById: initialNodeTouchedAtById,
    sectionExpandedById: initialSectionExpandedById,
    leftPrimaryMode: initialLeftPrimaryMode,
    activeSectionId: initialActiveSectionId,
    activeSmartViewId: initialActiveSmartViewId,
    activeSystemId: null,
    activeSystemRevision: null,
    searchQuery: initialSearchQuery,
    isLeftPanelOpen: initialIsLeftPanelOpen,
    isRightPanelOpen: initialIsRightPanelOpen,
    treeViewMode: initialTreeViewMode,
    hasUnsavedChanges: !!initialDraft,
    isDraftSaving: false,
    isServerSyncing: false,
    serverSyncError: null,
    lastDraftSavedAt: initialDraft?.savedAt ?? null,
    lastServerSavedAt: null,
    lastExportedAt: null,
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,

    importYaml: (yamlString: string) => {
      try {
        const parsed = yaml.load(yamlString);
        const warnings: string[] = [];
        const now = new Date().toISOString();
        let payload: ExportSchemaV2;

        if (Array.isArray(parsed)) {
          const legacyNodes = normalizeImportedNodes(parsed, warnings);
          const rootEntryNodeIds = getDefaultRootEntryNodeIds(legacyNodes);
          payload = {
            schemaVersion: EXPORT_SCHEMA_VERSION,
            exportedAt: now,
            nodes: Object.values(legacyNodes),
            rootEntryNodeIds,
            activeRootEntryNodeId: rootEntryNodeIds[0] ?? null,
            sectionsById: {},
            sectionRootOrder: [],
            nodeSectionIds: {},
            subtreeRulesById: {},
            customSmartViewsById: {},
            customSmartViewOrder: [],
            smartViewPinnedById: {},
            nodeTouchedAtById: {},
            leftPrimaryMode: 'roots',
            activeSectionId: null,
            activeSmartViewId: null,
          };
        } else if (isPlainRecord(parsed)) {
          const legacyWrappedNodes = Array.isArray(parsed.data) ? parsed.data : null;
          if (legacyWrappedNodes) {
            const migratedNodes = normalizeImportedNodes(legacyWrappedNodes, warnings);
            const rootEntryNodeIds = getDefaultRootEntryNodeIds(migratedNodes);
            payload = {
              schemaVersion: EXPORT_SCHEMA_VERSION,
              exportedAt: now,
              nodes: Object.values(migratedNodes),
              rootEntryNodeIds,
              activeRootEntryNodeId: rootEntryNodeIds[0] ?? null,
              sectionsById: {},
              sectionRootOrder: [],
              nodeSectionIds: {},
              subtreeRulesById: {},
              customSmartViewsById: {},
              customSmartViewOrder: [],
              smartViewPinnedById: {},
              nodeTouchedAtById: {},
              leftPrimaryMode: 'roots',
              activeSectionId: null,
              activeSmartViewId: null,
            };
          } else {
            payload = normalizeImportedV2Payload(parsed, warnings);
          }
        } else {
          throw new Error('Invalid YAML format: expected legacy array or schema object.');
        }

        const nodesById: Record<string, BiddingNode> = {};
        payload.nodes.forEach((node) => {
          nodesById[node.id] = node;
        });
        const sectionRootOrder = payload.sectionRootOrder.length > 0
          ? payload.sectionRootOrder.filter((sectionId) => !!payload.sectionsById[sectionId])
          : getSectionRootOrder(payload.sectionsById);
        const sectionExpandedById: Record<string, boolean> = Object.fromEntries(
          Object.keys(payload.sectionsById).map((sectionId) => [sectionId, true]),
        );

        const rootEntryNodeIds = normalizeRootEntryNodeIds(payload.rootEntryNodeIds, nodesById, warnings);
        const activeRootEntryNodeId = payload.activeRootEntryNodeId
          && nodesById[payload.activeRootEntryNodeId]
          && rootEntryNodeIds.includes(payload.activeRootEntryNodeId)
          ? payload.activeRootEntryNodeId
          : rootEntryNodeIds[0] ?? null;

        set({
          nodes: nodesById,
          selectedNodeId: null,
          selectedNodeIds: [],
          rootEntryNodeIds,
          activeRootEntryNodeId,
          sectionsById: payload.sectionsById,
          sectionRootOrder,
          nodeSectionIds: payload.nodeSectionIds,
          subtreeRulesById: payload.subtreeRulesById,
          customSmartViewsById: payload.customSmartViewsById,
          customSmartViewOrder: payload.customSmartViewOrder,
          smartViewPinnedById: payload.smartViewPinnedById,
          nodeTouchedAtById: payload.nodeTouchedAtById,
          sectionExpandedById,
          activeSectionId: payload.activeSectionId,
          activeSmartViewId: payload.activeSmartViewId,
          leftPrimaryMode: payload.leftPrimaryMode,
          hasUnsavedChanges: true,
          serverSyncError: null,
          lastExportedAt: null,
          undoStack: [],
          redoStack: [],
          canUndo: false,
          canRedo: false,
        });
        if (warnings.length > 0) {
          console.warn('[importYaml] Migration warnings:', warnings);
        }
        queueDraftSave();
      } catch (e) {
        console.error('Failed to parse YAML', e);
        alert('Failed to parse YAML');
      }
    },

    exportYaml: (options?: { legacy?: boolean }) => {
      const state = get();
      const exportedAt = new Date().toISOString();
      const useLegacyFormat = options?.legacy === true;

      let output: string;
      if (useLegacyFormat) {
        const legacyData = Object.values(state.nodes).map((node) => {
          const { isExpanded, isBookmarked, ...rest } = node;
          const legacySequence = toLegacyCallSequence(node.context.sequence);
          return {
            ...rest,
            id: legacySequence.join(' '),
            context: {
              ...rest.context,
              sequence: legacySequence,
            },
          };
        });
        output = yaml.dump(legacyData);
      } else {
        const payload: ExportSchemaV2 = {
          schemaVersion: EXPORT_SCHEMA_VERSION,
          exportedAt,
          nodes: Object.values(state.nodes),
          rootEntryNodeIds: state.rootEntryNodeIds,
          activeRootEntryNodeId: state.activeRootEntryNodeId,
          sectionsById: state.sectionsById,
          sectionRootOrder: state.sectionRootOrder,
          nodeSectionIds: state.nodeSectionIds,
          subtreeRulesById: state.subtreeRulesById,
          customSmartViewsById: state.customSmartViewsById,
          customSmartViewOrder: state.customSmartViewOrder,
          smartViewPinnedById: state.smartViewPinnedById,
          nodeTouchedAtById: state.nodeTouchedAtById,
          leftPrimaryMode: state.leftPrimaryMode,
          activeSectionId: state.activeSectionId,
          activeSmartViewId: state.activeSmartViewId,
        };
        output = yaml.dump(payload);
      }

      set({ lastExportedAt: exportedAt });
      flushDraftSave();
      return output;
    },

    addNode: (parentId: string | null, call: string, actor: BiddingActor = 'our') => {
      let didAdd = false;

      set((state) => {
        const normalizedCall = normalizeBiddingCall(call);
        if (!normalizedCall) return state;

        const canonicalParentId = parentId ? canonicalizeNodeId(parentId) : null;
        const parentNode = canonicalParentId ? state.nodes[canonicalParentId] : null;
        const sequence = parentNode
          ? [...parentNode.context.sequence, { call: normalizedCall, actor }]
          : [{ call: normalizedCall, actor }];
        const id = buildSequenceIdFromSteps(sequence);

        if (state.nodes[id]) return state;

        const newNode: BiddingNode = {
          id,
          context: { sequence },
          meaning: {
            type: 'response',
            forcing: 'NF',
            hcp: { min: '', max: '' },
          },
          isExpanded: true,
        };

        const updatedNodes = { ...state.nodes, [id]: newNode };
        if (canonicalParentId && updatedNodes[canonicalParentId]) {
          updatedNodes[canonicalParentId] = { ...updatedNodes[canonicalParentId], isExpanded: true };
        }
        const touchedAt = new Date().toISOString();
        const nextNodeSectionIds = { ...state.nodeSectionIds };
        if (
          state.leftPrimaryMode === 'sections'
          && state.activeSectionId
          && state.sectionsById[state.activeSectionId]
        ) {
          const existing = nextNodeSectionIds[id] ?? [];
          nextNodeSectionIds[id] = normalizeSectionIdList([...existing, state.activeSectionId]);
        }
        const shouldPromoteToRootEntry = !canonicalParentId;
        const nextRootEntryNodeIds = shouldPromoteToRootEntry
          ? sortNodeIdsBySequence(
            normalizeSectionIdList([...state.rootEntryNodeIds, id]),
            updatedNodes,
          )
          : state.rootEntryNodeIds;
        const nextActiveRootEntryNodeId = shouldPromoteToRootEntry
          ? id
          : state.activeRootEntryNodeId;

        didAdd = true;
        return withHistoryMutation(state, {
          nodes: updatedNodes,
          rootEntryNodeIds: nextRootEntryNodeIds,
          activeRootEntryNodeId: nextActiveRootEntryNodeId,
          nodeSectionIds: nextNodeSectionIds,
          nodeTouchedAtById: {
            ...state.nodeTouchedAtById,
            [id]: touchedAt,
          },
          selectedNodeId: id,
          selectedNodeIds: [id],
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didAdd) queueDraftSave();
    },

    updateNode: (id: string, updates: Partial<BiddingNode>) => {
      let didUpdate = false;

      set((state) => {
        const canonicalId = canonicalizeNodeId(id);
        if (!state.nodes[canonicalId]) return state;
        didUpdate = true;
        const touchedAt = new Date().toISOString();

        return withHistoryMutation(state, {
          nodes: {
            ...state.nodes,
            [canonicalId]: { ...state.nodes[canonicalId], ...updates },
          },
          nodeTouchedAtById: {
            ...state.nodeTouchedAtById,
            [canonicalId]: touchedAt,
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didUpdate) queueDraftSave();
    },

    renameNode: (id: string, newCall: string) => {
      let didRename = false;

      set((state) => {
        const canonicalId = canonicalizeNodeId(id);
        if (!state.nodes[canonicalId]) return state;
        const normalizedCall = normalizeBiddingCall(newCall);
        if (!normalizedCall) return state;

        const node = state.nodes[canonicalId];
        const oldSequence = [...node.context.sequence];
        const newSequence = [...oldSequence];
        newSequence[newSequence.length - 1] = {
          ...newSequence[newSequence.length - 1],
          call: normalizedCall,
        };

        const newId = buildSequenceIdFromSteps(newSequence);

        if (state.nodes[newId] && newId !== canonicalId) {
          alert('A sequence with this call already exists.');
          return state;
        }

        const newNodes = { ...state.nodes };

        const prefix = canonicalId + ' ';
        const newPrefix = newId + ' ';

        Object.keys(state.nodes).forEach((key) => {
          if (key === canonicalId) {
            newNodes[newId] = {
              ...state.nodes[canonicalId],
              id: newId,
              context: {
                ...state.nodes[canonicalId].context,
                sequence: newSequence,
              },
            };
            delete newNodes[canonicalId];
          } else if (key.startsWith(prefix)) {
            const suffix = key.substring(prefix.length);
            const childNewId = newPrefix + suffix;
            const childOldSequence = state.nodes[key].context.sequence;

            const childNewSequence = [...childOldSequence];
            childNewSequence[newSequence.length - 1] = {
              ...childNewSequence[newSequence.length - 1],
              call: normalizedCall,
            };

            newNodes[childNewId] = {
              ...state.nodes[key],
              id: childNewId,
              context: {
                ...state.nodes[key].context,
                sequence: childNewSequence,
              },
            };
            delete newNodes[key];
          }
        });

        const nextNodeSectionIds = remapNodeIdMapForRename(state.nodeSectionIds, canonicalId, newId);
        const nextNodeTouchedAtById = remapNodeIdMapForRename(state.nodeTouchedAtById, canonicalId, newId);
        const nextRootEntryNodeIds = sortNodeIdsBySequence(
          normalizeSectionIdList(remapNodeIdListForRename(state.rootEntryNodeIds, canonicalId, newId)),
          newNodes,
        );
        const nextActiveRootEntryNodeId = state.activeRootEntryNodeId === canonicalId
          ? newId
          : state.activeRootEntryNodeId?.startsWith(prefix)
            ? newPrefix + state.activeRootEntryNodeId.substring(prefix.length)
            : state.activeRootEntryNodeId;
        const nextSubtreeRulesById = Object.fromEntries(
          Object.entries(state.subtreeRulesById).map(([ruleId, rule]) => {
            if (rule.rootNodeId === canonicalId) {
              return [ruleId, { ...rule, rootNodeId: newId, updatedAt: new Date().toISOString() }];
            }
            if (rule.rootNodeId.startsWith(prefix)) {
              const suffix = rule.rootNodeId.substring(prefix.length);
              return [ruleId, { ...rule, rootNodeId: newPrefix + suffix, updatedAt: new Date().toISOString() }];
            }
            return [ruleId, rule];
          }),
        ) as Record<string, SubtreeRuleRecord>;

        didRename = true;
        return withHistoryMutation(state, {
          nodes: newNodes,
          rootEntryNodeIds: nextRootEntryNodeIds,
          activeRootEntryNodeId: nextActiveRootEntryNodeId,
          nodeSectionIds: nextNodeSectionIds,
          nodeTouchedAtById: nextNodeTouchedAtById,
          subtreeRulesById: nextSubtreeRulesById,
          hasUnsavedChanges: true,
          serverSyncError: null,
          selectedNodeId: state.selectedNodeId === canonicalId
            ? newId
            : state.selectedNodeId?.startsWith(prefix)
              ? newPrefix + state.selectedNodeId.substring(prefix.length)
              : state.selectedNodeId,
          selectedNodeIds: normalizeSectionIdList(
            state.selectedNodeIds.map((selectedId) => {
              if (selectedId === canonicalId) return newId;
              if (selectedId.startsWith(prefix)) return newPrefix + selectedId.substring(prefix.length);
              return selectedId;
            }),
          ),
        });
      });

      if (didRename) queueDraftSave();
    },

    deleteNode: (id: string) => {
      let didDelete = false;

      set((state) => {
        const canonicalId = canonicalizeNodeId(id);
        const newNodes = { ...state.nodes };
        const prefix = canonicalId + ' ';

        Object.keys(newNodes).forEach((key) => {
          if (key === canonicalId || key.startsWith(prefix)) {
            delete newNodes[key];
            didDelete = true;
          }
        });

        if (!didDelete) return state;

        const nextNodeSectionIds = Object.fromEntries(
          Object.entries(state.nodeSectionIds).filter(([nodeId]) => !isNodeWithinSubtree(nodeId, canonicalId)),
        ) as Record<string, string[]>;

        const nextSubtreeRulesById = Object.fromEntries(
          Object.entries(state.subtreeRulesById).filter(([, rule]) => !isNodeWithinSubtree(rule.rootNodeId, canonicalId)),
        ) as Record<string, SubtreeRuleRecord>;
        const nextNodeTouchedAtById = Object.fromEntries(
          Object.entries(state.nodeTouchedAtById).filter(([nodeId]) => !isNodeWithinSubtree(nodeId, canonicalId)),
        ) as Record<string, string>;
        const nextRootEntryNodeIds = state.rootEntryNodeIds.filter(
          (nodeId) => !isNodeWithinSubtree(nodeId, canonicalId),
        );
        const nextActiveRootEntryNodeId = state.activeRootEntryNodeId
          && isNodeWithinSubtree(state.activeRootEntryNodeId, canonicalId)
          ? nextRootEntryNodeIds[0] ?? null
          : state.activeRootEntryNodeId;

        return withHistoryMutation(state, {
          nodes: newNodes,
          rootEntryNodeIds: nextRootEntryNodeIds,
          activeRootEntryNodeId: nextActiveRootEntryNodeId,
          nodeSectionIds: nextNodeSectionIds,
          nodeTouchedAtById: nextNodeTouchedAtById,
          subtreeRulesById: nextSubtreeRulesById,
          hasUnsavedChanges: true,
          serverSyncError: null,
          selectedNodeId: state.selectedNodeId === canonicalId || state.selectedNodeId?.startsWith(prefix)
            ? null
            : state.selectedNodeId,
          selectedNodeIds: state.selectedNodeIds.filter((selectedId) => !isNodeWithinSubtree(selectedId, canonicalId)),
        });
      });

      if (didDelete) queueDraftSave();
    },

    selectNode: (id: string | null) => set((state) => {
      if (!id) {
        return { selectedNodeId: null, selectedNodeIds: [] };
      }
      const canonicalId = canonicalizeNodeId(id);
      if (!state.nodes[canonicalId]) return state;
      return { selectedNodeId: canonicalId, selectedNodeIds: [canonicalId] };
    }),

    toggleNodeSelection: (id: string) => set((state) => {
      const canonicalId = canonicalizeNodeId(id);
      if (!state.nodes[canonicalId]) return state;
      const exists = state.selectedNodeIds.includes(canonicalId);
      const selectedNodeIds = exists
        ? state.selectedNodeIds.filter((item) => item !== canonicalId)
        : normalizeSectionIdList([...state.selectedNodeIds, canonicalId]);
      return {
        selectedNodeIds,
        selectedNodeId: selectedNodeIds.length > 0 ? selectedNodeIds[selectedNodeIds.length - 1] : null,
      };
    }),

    setNodeSelection: (nodeIds: string[]) => set((state) => {
      const selectedNodeIds = normalizeSectionIdList(
        nodeIds
          .map((nodeId) => canonicalizeNodeId(nodeId))
          .filter((nodeId) => !!state.nodes[nodeId]),
      );
      return {
        selectedNodeIds,
        selectedNodeId: selectedNodeIds.length > 0 ? selectedNodeIds[selectedNodeIds.length - 1] : null,
      };
    }),

    clearNodeSelection: () => set({ selectedNodeIds: [], selectedNodeId: null }),

    toggleExpand: (id: string) => set((state) => {
      const canonicalId = canonicalizeNodeId(id);
      if (!state.nodes[canonicalId]) return state;
      return {
        nodes: {
          ...state.nodes,
          [canonicalId]: { ...state.nodes[canonicalId], isExpanded: !state.nodes[canonicalId].isExpanded },
        },
      };
    }),

    setSearchQuery: (query: string) => {
      const nextQuery = query ?? '';
      if (get().searchQuery === nextQuery) return;
      set({ searchQuery: nextQuery });
      queueDraftSave();
    },

    toggleBookmark: (id: string) => set((state) => {
      const canonicalId = canonicalizeNodeId(id);
      if (!state.nodes[canonicalId]) return state;
      return {
        nodes: {
          ...state.nodes,
          [canonicalId]: { ...state.nodes[canonicalId], isBookmarked: !state.nodes[canonicalId].isBookmarked },
        },
      };
    }),

    toggleLeftPanel: () => {
      set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen }));
      queueDraftSave();
    },
    toggleRightPanel: () => {
      set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen }));
      queueDraftSave();
    },
    setTreeViewMode: (mode: EditorTreeViewMode) => {
      const normalizedMode: EditorTreeViewMode = mode === 'compact' ? 'compact' : 'classic';
      if (get().treeViewMode === normalizedMode) return;
      set({ treeViewMode: normalizedMode });
      queueDraftSave();
    },

    expandAll: () => set((state) => {
      const newNodes = { ...state.nodes };
      Object.keys(newNodes).forEach((key) => {
        newNodes[key] = { ...newNodes[key], isExpanded: true };
      });
      return { nodes: newNodes };
    }),

    collapseAll: () => set((state) => {
      const newNodes = { ...state.nodes };
      Object.keys(newNodes).forEach((key) => {
        newNodes[key] = { ...newNodes[key], isExpanded: false };
      });
      return { nodes: newNodes };
    }),

    expandToDepth: (depth: number) => set((state) => {
      const newNodes = { ...state.nodes };
      Object.keys(newNodes).forEach((key) => {
        const nodeDepth = newNodes[key].context.sequence.length;
        newNodes[key] = { ...newNodes[key], isExpanded: nodeDepth < depth };
      });
      return { nodes: newNodes };
    }),

    setActiveSystem: (systemId: string | null, revision?: number | null) =>
      set((state) => ({
        activeSystemId: systemId,
        activeSystemRevision: revision === undefined ? state.activeSystemRevision : revision,
      })),

    hydrateFromRemoteSystem: (input) =>
      set((state) => {
        const remoteNodes: Record<string, BiddingNode> = {};
        for (const node of input.nodes) {
          const normalized = toNodeFromRemote(node.sequenceId, node.payload);
          remoteNodes[normalized.id] = normalized;
        }

        const selectedNodeId = state.selectedNodeId && remoteNodes[state.selectedNodeId] ? state.selectedNodeId : null;
        const rootEntryNodeIds = getDefaultRootEntryNodeIds(remoteNodes);
        const activeRootEntryNodeId = rootEntryNodeIds[0] ?? null;

        return {
          nodes: remoteNodes,
          selectedNodeId,
          selectedNodeIds: selectedNodeId ? [selectedNodeId] : [],
          rootEntryNodeIds,
          activeRootEntryNodeId,
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
          activeSystemId: input.systemId,
          activeSystemRevision: input.revision,
          hasUnsavedChanges: false,
          isServerSyncing: false,
          serverSyncError: null,
          lastServerSavedAt: new Date().toISOString(),
          undoStack: [],
          redoStack: [],
          canUndo: false,
          canRedo: false,
        };
      }),

    markServerSyncStarted: () => set({ isServerSyncing: true, serverSyncError: null }),

    markServerSyncSuccess: (revision: number, clearUnsaved = true) =>
      set((state) => ({
        activeSystemRevision: revision,
        hasUnsavedChanges: clearUnsaved ? false : state.hasUnsavedChanges,
        isServerSyncing: false,
        serverSyncError: null,
        lastServerSavedAt: new Date().toISOString(),
      })),

    markServerSyncError: (message: string) => set({ isServerSyncing: false, serverSyncError: message }),

    markUnsavedChanges: () => set({ hasUnsavedChanges: true, serverSyncError: null }),

    createSection: (name: string, parentId: string | null = null) => {
      let result: SectionMutationResult = { ok: false, error: 'Failed to create section.' };
      let didCreate = false;

      set((state) => {
        const normalizedName = normalizeSectionName(name);
        if (!normalizedName) {
          result = { ok: false, error: 'Section name is required.' };
          return state;
        }
        if (normalizedName.length > SECTION_NAME_MAX_LENGTH) {
          result = { ok: false, error: `Section name must be ${SECTION_NAME_MAX_LENGTH} characters or less.` };
          return state;
        }

        const normalizedParentId = parentId ?? null;
        if (normalizedParentId && !state.sectionsById[normalizedParentId]) {
          result = { ok: false, error: 'Parent section does not exist.' };
          return state;
        }
        if (hasSectionNameConflict(state.sectionsById, normalizedParentId, normalizedName)) {
          result = { ok: false, error: 'A section with this name already exists in the same level.' };
          return state;
        }

        const sectionId = nextSectionId(state.sectionsById);
        const createdAt = new Date().toISOString();
        const siblingIds = getSiblingIdsSorted(state.sectionsById, normalizedParentId);

        const nextSectionsById: Record<string, SectionRecord> = {
          ...state.sectionsById,
          [sectionId]: {
            id: sectionId,
            name: normalizedName,
            parentId: normalizedParentId,
            order: siblingIds.length,
            createdAt,
            updatedAt: createdAt,
          },
        };

        didCreate = true;
        result = { ok: true, sectionId };
        return withHistoryMutation(state, {
          sectionsById: nextSectionsById,
          sectionRootOrder: getSectionRootOrder(nextSectionsById),
          sectionExpandedById: {
            ...state.sectionExpandedById,
            [sectionId]: true,
          },
          leftPrimaryMode: 'sections' as LeftPrimaryMode,
          activeSectionId: sectionId,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didCreate) queueDraftSave();
      return result;
    },

    renameSection: (sectionId: string, name: string) => {
      let result: SectionMutationResult = { ok: false, error: 'Failed to rename section.' };
      let didRename = false;

      set((state) => {
        const section = state.sectionsById[sectionId];
        if (!section) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }

        const normalizedName = normalizeSectionName(name);
        if (!normalizedName) {
          result = { ok: false, error: 'Section name is required.' };
          return state;
        }
        if (normalizedName.length > SECTION_NAME_MAX_LENGTH) {
          result = { ok: false, error: `Section name must be ${SECTION_NAME_MAX_LENGTH} characters or less.` };
          return state;
        }
        if (hasSectionNameConflict(state.sectionsById, section.parentId, normalizedName, sectionId)) {
          result = { ok: false, error: 'A section with this name already exists in the same level.' };
          return state;
        }
        if (section.name === normalizedName) {
          result = { ok: true, sectionId };
          return state;
        }

        const updatedAt = new Date().toISOString();
        const nextSectionsById: Record<string, SectionRecord> = {
          ...state.sectionsById,
          [sectionId]: {
            ...section,
            name: normalizedName,
            updatedAt,
          },
        };

        didRename = true;
        result = { ok: true, sectionId };
        return withHistoryMutation(state, {
          sectionsById: nextSectionsById,
          sectionRootOrder: getSectionRootOrder(nextSectionsById),
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didRename) queueDraftSave();
      return result;
    },

    moveSection: (sectionId: string, targetParentId: string | null, targetIndex?: number) => {
      let result: SectionMutationResult = { ok: false, error: 'Failed to move section.' };
      let didMove = false;

      set((state) => {
        const section = state.sectionsById[sectionId];
        if (!section) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }

        const normalizedTargetParent = targetParentId ?? null;
        if (normalizedTargetParent && !state.sectionsById[normalizedTargetParent]) {
          result = { ok: false, error: 'Target parent section does not exist.' };
          return state;
        }
        if (normalizedTargetParent === sectionId) {
          result = { ok: false, error: 'Section cannot be moved into itself.' };
          return state;
        }
        if (isDescendantSection(state.sectionsById, sectionId, normalizedTargetParent)) {
          result = { ok: false, error: 'Section cannot be moved into its descendant.' };
          return state;
        }

        const sourceParentId = section.parentId;
        const sourceSiblingIds = getSiblingIdsSorted(state.sectionsById, sourceParentId).filter((id) => id !== sectionId);
        const targetSiblingIds = sourceParentId === normalizedTargetParent
          ? sourceSiblingIds
          : getSiblingIdsSorted(state.sectionsById, normalizedTargetParent);
        const insertionIndex = clampIndex(targetIndex ?? targetSiblingIds.length, targetSiblingIds.length);
        const nextTargetSiblingIds = [...targetSiblingIds];
        nextTargetSiblingIds.splice(insertionIndex, 0, sectionId);

        let nextSectionsById = { ...state.sectionsById };
        if (sourceParentId !== normalizedTargetParent) {
          nextSectionsById = applySiblingOrder(nextSectionsById, sourceParentId, sourceSiblingIds);
        }
        nextSectionsById = applySiblingOrder(nextSectionsById, normalizedTargetParent, nextTargetSiblingIds);

        const updatedAt = new Date().toISOString();
        nextSectionsById[sectionId] = {
          ...nextSectionsById[sectionId],
          updatedAt,
        };

        didMove = true;
        result = { ok: true, sectionId };
        return withHistoryMutation(state, {
          sectionsById: nextSectionsById,
          sectionRootOrder: getSectionRootOrder(nextSectionsById),
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didMove) queueDraftSave();
      return result;
    },

    reorderSection: (sectionId: string, targetIndex: number) => {
      const section = get().sectionsById[sectionId];
      if (!section) return { ok: false, error: 'Section not found.' };
      return get().moveSection(sectionId, section.parentId, targetIndex);
    },

    deleteSection: (sectionId: string) => {
      let result: SectionMutationResult = { ok: false, error: 'Failed to delete section.' };
      let didDelete = false;

      set((state) => {
        const target = state.sectionsById[sectionId];
        if (!target) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }

        let nextSectionsById = { ...state.sectionsById };
        delete nextSectionsById[sectionId];

        const movedChildIds = getSiblingIdsSorted(nextSectionsById, sectionId);
        const targetParentId = target.parentId;
        const destinationIds = getSiblingIdsSorted(nextSectionsById, targetParentId).concat(movedChildIds);
        nextSectionsById = applySiblingOrder(nextSectionsById, targetParentId, destinationIds);

        const updatedAt = new Date().toISOString();
        movedChildIds.forEach((childId) => {
          if (!nextSectionsById[childId]) return;
          nextSectionsById[childId] = {
            ...nextSectionsById[childId],
            updatedAt,
          };
        });

        didDelete = true;
        result = { ok: true, sectionId };
        const { [sectionId]: _removedExpandedState, ...nextExpandedById } = state.sectionExpandedById;
        const nextNodeSectionIds = Object.fromEntries(
          Object.entries(state.nodeSectionIds)
            .map(([nodeId, sectionIds]) => [nodeId, sectionIds.filter((id) => id !== sectionId)] as const)
            .filter(([, sectionIds]) => sectionIds.length > 0),
        ) as Record<string, string[]>;
        const nextSubtreeRulesById = Object.fromEntries(
          Object.entries(state.subtreeRulesById).filter(([, rule]) => rule.sectionId !== sectionId),
        ) as Record<string, SubtreeRuleRecord>;
        return withHistoryMutation(state, {
          sectionsById: nextSectionsById,
          sectionRootOrder: getSectionRootOrder(nextSectionsById),
          nodeSectionIds: nextNodeSectionIds,
          subtreeRulesById: nextSubtreeRulesById,
          sectionExpandedById: nextExpandedById,
          activeSectionId: state.activeSectionId === sectionId ? targetParentId : state.activeSectionId,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didDelete) queueDraftSave();
      return result;
    },

    assignNodeToSection: (nodeId: string, sectionId: string) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to assign section.' };
      let didAssign = false;

      set((state) => {
        const canonicalNodeId = canonicalizeNodeId(nodeId);
        if (!state.nodes[canonicalNodeId]) {
          result = { ok: false, error: 'Node not found.' };
          return state;
        }
        if (!state.sectionsById[sectionId]) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }

        const existing = state.nodeSectionIds[canonicalNodeId] ?? [];
        if (existing.includes(sectionId)) {
          result = { ok: true };
          return state;
        }

        didAssign = true;
        result = { ok: true };
        return withHistoryMutation(state, {
          nodeSectionIds: {
            ...state.nodeSectionIds,
            [canonicalNodeId]: [...existing, sectionId],
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didAssign) queueDraftSave();
      return result;
    },

    unassignNodeFromSection: (nodeId: string, sectionId: string) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to unassign section.' };
      let didUnassign = false;

      set((state) => {
        const canonicalNodeId = canonicalizeNodeId(nodeId);
        if (!state.nodes[canonicalNodeId]) {
          result = { ok: false, error: 'Node not found.' };
          return state;
        }
        if (!state.sectionsById[sectionId]) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }

        const existing = state.nodeSectionIds[canonicalNodeId] ?? [];
        if (!existing.includes(sectionId)) {
          result = { ok: true };
          return state;
        }

        const nextIds = existing.filter((id) => id !== sectionId);
        const nextNodeSectionIds = { ...state.nodeSectionIds };
        if (nextIds.length > 0) {
          nextNodeSectionIds[canonicalNodeId] = nextIds;
        } else {
          delete nextNodeSectionIds[canonicalNodeId];
        }

        didUnassign = true;
        result = { ok: true };
        return withHistoryMutation(state, {
          nodeSectionIds: nextNodeSectionIds,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didUnassign) queueDraftSave();
      return result;
    },

    setNodeSections: (nodeId: string, sectionIds: string[]) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to set node sections.' };
      let didSet = false;

      set((state) => {
        const canonicalNodeId = canonicalizeNodeId(nodeId);
        if (!state.nodes[canonicalNodeId]) {
          result = { ok: false, error: 'Node not found.' };
          return state;
        }

        const normalized = normalizeSectionIdList(sectionIds);
        const hasMissingSection = normalized.some((sectionId) => !state.sectionsById[sectionId]);
        if (hasMissingSection) {
          result = { ok: false, error: 'One or more sections were not found.' };
          return state;
        }

        const previous = state.nodeSectionIds[canonicalNodeId] ?? [];
        if (previous.length === normalized.length && previous.every((id, index) => id === normalized[index])) {
          result = { ok: true };
          return state;
        }

        const nextNodeSectionIds = { ...state.nodeSectionIds };
        if (normalized.length > 0) {
          nextNodeSectionIds[canonicalNodeId] = normalized;
        } else {
          delete nextNodeSectionIds[canonicalNodeId];
        }

        didSet = true;
        result = { ok: true };
        return withHistoryMutation(state, {
          nodeSectionIds: nextNodeSectionIds,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didSet) queueDraftSave();
      return result;
    },

    createSubtreeRule: (sectionId: string, rootNodeId: string, includeFutureDescendants = true) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to create subtree rule.' };
      let didCreate = false;

      set((state) => {
        const canonicalRootNodeId = canonicalizeNodeId(rootNodeId);
        if (!state.sectionsById[sectionId]) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }
        if (!state.nodes[canonicalRootNodeId]) {
          result = { ok: false, error: 'Root node not found.' };
          return state;
        }

        const existingRule = Object.values(state.subtreeRulesById).find(
          (rule) => rule.sectionId === sectionId && rule.rootNodeId === canonicalRootNodeId,
        );
        if (existingRule) {
          result = { ok: true, ruleId: existingRule.id };
          return state;
        }

        const ruleId = nextSubtreeRuleId(state.subtreeRulesById);
        const timestamp = new Date().toISOString();
        didCreate = true;
        result = { ok: true, ruleId };

        return withHistoryMutation(state, {
          subtreeRulesById: {
            ...state.subtreeRulesById,
            [ruleId]: {
              id: ruleId,
              sectionId,
              rootNodeId: canonicalRootNodeId,
              includeFutureDescendants,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didCreate) queueDraftSave();
      return result;
    },

    deleteSubtreeRule: (ruleId: string) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to delete subtree rule.' };
      let didDelete = false;

      set((state) => {
        if (!state.subtreeRulesById[ruleId]) {
          result = { ok: false, error: 'Subtree rule not found.' };
          return state;
        }

        const nextRules = { ...state.subtreeRulesById };
        delete nextRules[ruleId];

        didDelete = true;
        result = { ok: true };
        return withHistoryMutation(state, {
          subtreeRulesById: nextRules,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didDelete) queueDraftSave();
      return result;
    },

    createCustomSmartView: (name: string, query: string, field: CustomSmartViewField = 'all') => {
      let result: SmartViewMutationResult = { ok: false, error: 'Failed to create smart view.' };
      let didCreate = false;

      set((state) => {
        const normalizedName = normalizeSmartViewName(name);
        const normalizedQuery = normalizeSmartViewQuery(query);
        if (!normalizedName) {
          result = { ok: false, error: 'Smart view name is required.' };
          return state;
        }
        if (normalizedName.length > SMART_VIEW_NAME_MAX_LENGTH) {
          result = { ok: false, error: `Name must be ${SMART_VIEW_NAME_MAX_LENGTH} characters or less.` };
          return state;
        }
        if (!normalizedQuery) {
          result = { ok: false, error: 'Query is required for custom smart view.' };
          return state;
        }
        if (normalizedQuery.length > SMART_VIEW_QUERY_MAX_LENGTH) {
          result = { ok: false, error: `Query must be ${SMART_VIEW_QUERY_MAX_LENGTH} characters or less.` };
          return state;
        }
        const hasDuplicateName = Object.values(state.customSmartViewsById)
          .some((item) => item.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase());
        if (hasDuplicateName) {
          result = { ok: false, error: 'Custom smart view with this name already exists.' };
          return state;
        }

        const smartViewId = nextCustomSmartViewId(state.customSmartViewsById);
        const timestamp = new Date().toISOString();
        const order = state.customSmartViewOrder.length;
        didCreate = true;
        result = { ok: true, smartViewId };

        return withHistoryMutation(state, {
          customSmartViewsById: {
            ...state.customSmartViewsById,
            [smartViewId]: {
              id: smartViewId,
              name: normalizedName,
              query: normalizedQuery,
              field,
              order,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          },
          customSmartViewOrder: [...state.customSmartViewOrder, smartViewId],
          leftPrimaryMode: 'smartViews' as LeftPrimaryMode,
          activeSmartViewId: smartViewId,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didCreate) queueDraftSave();
      return result;
    },

    updateCustomSmartView: (smartViewId: string, input) => {
      let result: SmartViewMutationResult = { ok: false, error: 'Failed to update smart view.' };
      let didUpdate = false;

      set((state) => {
        const current = state.customSmartViewsById[smartViewId];
        if (!current) {
          result = { ok: false, error: 'Custom smart view not found.' };
          return state;
        }

        const nextName = input.name === undefined ? current.name : normalizeSmartViewName(input.name);
        const nextQuery = input.query === undefined ? current.query : normalizeSmartViewQuery(input.query);
        const nextField = input.field ?? current.field;

        if (!nextName) {
          result = { ok: false, error: 'Smart view name is required.' };
          return state;
        }
        if (nextName.length > SMART_VIEW_NAME_MAX_LENGTH) {
          result = { ok: false, error: `Name must be ${SMART_VIEW_NAME_MAX_LENGTH} characters or less.` };
          return state;
        }
        if (!nextQuery) {
          result = { ok: false, error: 'Query is required for custom smart view.' };
          return state;
        }
        if (nextQuery.length > SMART_VIEW_QUERY_MAX_LENGTH) {
          result = { ok: false, error: `Query must be ${SMART_VIEW_QUERY_MAX_LENGTH} characters or less.` };
          return state;
        }
        const hasDuplicateName = Object.values(state.customSmartViewsById).some((item) =>
          item.id !== smartViewId && item.name.toLocaleLowerCase() === nextName.toLocaleLowerCase(),
        );
        if (hasDuplicateName) {
          result = { ok: false, error: 'Custom smart view with this name already exists.' };
          return state;
        }

        if (nextName === current.name && nextQuery === current.query && nextField === current.field) {
          result = { ok: true, smartViewId };
          return state;
        }

        didUpdate = true;
        result = { ok: true, smartViewId };
        return withHistoryMutation(state, {
          customSmartViewsById: {
            ...state.customSmartViewsById,
            [smartViewId]: {
              ...current,
              name: nextName,
              query: nextQuery,
              field: nextField,
              updatedAt: new Date().toISOString(),
            },
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didUpdate) queueDraftSave();
      return result;
    },

    deleteCustomSmartView: (smartViewId: string) => {
      let result: SmartViewMutationResult = { ok: false, error: 'Failed to delete smart view.' };
      let didDelete = false;

      set((state) => {
        if (!state.customSmartViewsById[smartViewId]) {
          result = { ok: false, error: 'Custom smart view not found.' };
          return state;
        }

        const nextById = { ...state.customSmartViewsById };
        delete nextById[smartViewId];
        const nextOrder = state.customSmartViewOrder.filter((id) => id !== smartViewId);
        const { [smartViewId]: _removedPinState, ...nextPinnedById } = state.smartViewPinnedById;

        didDelete = true;
        result = { ok: true, smartViewId };
        return withHistoryMutation(state, {
          customSmartViewsById: nextById,
          customSmartViewOrder: nextOrder,
          smartViewPinnedById: nextPinnedById,
          activeSmartViewId: state.activeSmartViewId === smartViewId ? null : state.activeSmartViewId,
          leftPrimaryMode:
            state.leftPrimaryMode === 'smartViews' && state.activeSmartViewId === smartViewId
              ? 'roots'
              : state.leftPrimaryMode,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didDelete) queueDraftSave();
      return result;
    },

    toggleSmartViewPinned: (smartViewId: string) => {
      let result: SmartViewMutationResult = { ok: false, error: 'Smart view not found.' };
      let didToggle = false;

      set((state) => {
        const knownSmartView = isBuiltInSmartViewId(smartViewId) || !!state.customSmartViewsById[smartViewId];
        if (!knownSmartView) {
          result = { ok: false, error: 'Smart view not found.' };
          return state;
        }
        const nextPinned = !state.smartViewPinnedById[smartViewId];
        didToggle = true;
        result = { ok: true, smartViewId };
        return withHistoryMutation(state, {
          smartViewPinnedById: {
            ...state.smartViewPinnedById,
            [smartViewId]: nextPinned,
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didToggle) queueDraftSave();
      return result;
    },

    setLeftPrimaryMode: (mode: LeftPrimaryMode) => {
      if (get().leftPrimaryMode === mode) return;
      set({ leftPrimaryMode: mode });
      queueDraftSave();
    },

    addRootEntry: (nodeId: string) => {
      let result: RootEntryMutationResult = { ok: false, error: 'Failed to add root entry.' };
      let didAdd = false;

      set((state) => {
        const canonicalNodeId = canonicalizeNodeId(nodeId);
        if (!state.nodes[canonicalNodeId]) {
          result = { ok: false, error: 'Node not found.' };
          return state;
        }
        if (state.rootEntryNodeIds.includes(canonicalNodeId)) {
          result = { ok: true, nodeId: canonicalNodeId };
          return state;
        }

        const nextRootEntryNodeIds = sortNodeIdsBySequence(
          normalizeSectionIdList([...state.rootEntryNodeIds, canonicalNodeId]),
          state.nodes,
        );
        didAdd = true;
        result = { ok: true, nodeId: canonicalNodeId };
        return withHistoryMutation(state, {
          rootEntryNodeIds: nextRootEntryNodeIds,
          activeRootEntryNodeId: canonicalNodeId,
          leftPrimaryMode: 'roots' as LeftPrimaryMode,
          activeSectionId: null,
          activeSmartViewId: null,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didAdd) queueDraftSave();
      return result;
    },

    removeRootEntry: (nodeId: string) => {
      let result: RootEntryMutationResult = { ok: false, error: 'Root entry not found.' };
      let didRemove = false;

      set((state) => {
        const canonicalNodeId = canonicalizeNodeId(nodeId);
        if (!state.rootEntryNodeIds.includes(canonicalNodeId)) {
          result = { ok: false, error: 'Root entry not found.' };
          return state;
        }
        const nextRootEntryNodeIds = state.rootEntryNodeIds.filter((id) => id !== canonicalNodeId);
        const nextActiveRootEntryNodeId = state.activeRootEntryNodeId === canonicalNodeId
          ? nextRootEntryNodeIds[0] ?? null
          : state.activeRootEntryNodeId;
        didRemove = true;
        result = { ok: true, nodeId: canonicalNodeId };
        return withHistoryMutation(state, {
          rootEntryNodeIds: nextRootEntryNodeIds,
          activeRootEntryNodeId: nextActiveRootEntryNodeId,
          leftPrimaryMode:
            state.leftPrimaryMode === 'roots' && !nextActiveRootEntryNodeId
              ? 'roots'
              : state.leftPrimaryMode,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didRemove) queueDraftSave();
      return result;
    },

    batchAssignNodesToSection: (nodeIds: string[], sectionId: string) => {
      let result: BatchMutationResult = { ok: false, error: 'Failed to assign nodes to section.' };
      let didUpdate = false;

      set((state) => {
        if (!state.sectionsById[sectionId]) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }

        const canonicalIds = normalizeSectionIdList(
          nodeIds
            .map((nodeId) => canonicalizeNodeId(nodeId))
            .filter((nodeId) => !!state.nodes[nodeId]),
        );
        if (canonicalIds.length === 0) {
          result = { ok: true, updatedCount: 0 };
          return state;
        }

        const nextNodeSectionIds = { ...state.nodeSectionIds };
        let updatedCount = 0;
        canonicalIds.forEach((nodeId) => {
          const existing = nextNodeSectionIds[nodeId] ?? [];
          if (existing.includes(sectionId)) return;
          nextNodeSectionIds[nodeId] = normalizeSectionIdList([...existing, sectionId]);
          updatedCount += 1;
        });

        if (updatedCount === 0) {
          result = { ok: true, updatedCount: 0 };
          return state;
        }

        didUpdate = true;
        result = { ok: true, updatedCount };
        return withHistoryMutation(state, {
          nodeSectionIds: nextNodeSectionIds,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didUpdate) queueDraftSave();
      return result;
    },

    batchSetBookmarks: (nodeIds: string[], bookmarked: boolean) => {
      let result: BatchMutationResult = { ok: false, error: 'Failed to update bookmarks.' };
      let didUpdate = false;

      set((state) => {
        const canonicalIds = normalizeSectionIdList(
          nodeIds
            .map((nodeId) => canonicalizeNodeId(nodeId))
            .filter((nodeId) => !!state.nodes[nodeId]),
        );
        if (canonicalIds.length === 0) {
          result = { ok: true, updatedCount: 0 };
          return state;
        }

        const nextNodes = { ...state.nodes };
        let updatedCount = 0;
        canonicalIds.forEach((nodeId) => {
          const current = nextNodes[nodeId];
          if (!current || !!current.isBookmarked === bookmarked) return;
          nextNodes[nodeId] = { ...current, isBookmarked: bookmarked };
          updatedCount += 1;
        });

        if (updatedCount === 0) {
          result = { ok: true, updatedCount: 0 };
          return state;
        }

        didUpdate = true;
        result = { ok: true, updatedCount };
        return withHistoryMutation(state, {
          nodes: nextNodes,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didUpdate) queueDraftSave();
      return result;
    },

    batchSetRootEntries: (nodeIds: string[], enabled: boolean) => {
      let result: BatchMutationResult = { ok: false, error: 'Failed to update roots.' };
      let didUpdate = false;

      set((state) => {
        const canonicalIds = normalizeSectionIdList(
          nodeIds
            .map((nodeId) => canonicalizeNodeId(nodeId))
            .filter((nodeId) => !!state.nodes[nodeId]),
        );
        if (canonicalIds.length === 0) {
          result = { ok: true, updatedCount: 0 };
          return state;
        }

        const beforeSet = new Set(state.rootEntryNodeIds);
        const nextRootEntryNodeIds = enabled
          ? sortNodeIdsBySequence(normalizeSectionIdList([...state.rootEntryNodeIds, ...canonicalIds]), state.nodes)
          : state.rootEntryNodeIds.filter((rootId) => !canonicalIds.includes(rootId));
        const afterSet = new Set(nextRootEntryNodeIds);

        const updatedCount = canonicalIds.reduce((acc, nodeId) => {
          const before = beforeSet.has(nodeId);
          const after = afterSet.has(nodeId);
          return before === after ? acc : acc + 1;
        }, 0);

        if (updatedCount === 0) {
          result = { ok: true, updatedCount: 0 };
          return state;
        }

        const nextActiveRootEntryNodeId = state.activeRootEntryNodeId && afterSet.has(state.activeRootEntryNodeId)
          ? state.activeRootEntryNodeId
          : nextRootEntryNodeIds[0] ?? null;

        didUpdate = true;
        result = { ok: true, updatedCount };
        return withHistoryMutation(state, {
          rootEntryNodeIds: nextRootEntryNodeIds,
          activeRootEntryNodeId: nextActiveRootEntryNodeId,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didUpdate) queueDraftSave();
      return result;
    },

    batchSetAccepted: (nodeIds: string[], accepted: boolean) => {
      let result: BatchMutationResult = { ok: false, error: 'Failed to update accepted status.' };
      let didUpdate = false;

      set((state) => {
        const canonicalIds = normalizeSectionIdList(
          nodeIds
            .map((nodeId) => canonicalizeNodeId(nodeId))
            .filter((nodeId) => !!state.nodes[nodeId]),
        );
        if (canonicalIds.length === 0) {
          result = { ok: true, updatedCount: 0 };
          return state;
        }

        const nextNodes = { ...state.nodes };
        const nextNodeTouchedAtById = { ...state.nodeTouchedAtById };
        const touchedAt = new Date().toISOString();
        let updatedCount = 0;

        canonicalIds.forEach((nodeId) => {
          const node = nextNodes[nodeId];
          const currentAccepted = !!node?.meaning?.accepted;
          if (!node || currentAccepted === accepted) return;
          nextNodes[nodeId] = {
            ...node,
            meaning: {
              ...(node.meaning || {}),
              accepted,
            },
          };
          nextNodeTouchedAtById[nodeId] = touchedAt;
          updatedCount += 1;
        });

        if (updatedCount === 0) {
          result = { ok: true, updatedCount: 0 };
          return state;
        }

        didUpdate = true;
        result = { ok: true, updatedCount };
        return withHistoryMutation(state, {
          nodes: nextNodes,
          nodeTouchedAtById: nextNodeTouchedAtById,
          hasUnsavedChanges: true,
          serverSyncError: null,
        });
      });

      if (didUpdate) queueDraftSave();
      return result;
    },

    setActiveRootEntryNodeId: (nodeId: string | null) => {
      let didUpdate = false;
      set((state) => {
        if (!nodeId) {
          if (state.activeRootEntryNodeId === null) return state;
          didUpdate = true;
          return { activeRootEntryNodeId: null };
        }
        const canonicalNodeId = canonicalizeNodeId(nodeId);
        if (!state.rootEntryNodeIds.includes(canonicalNodeId)) return state;

        const pathTokens = canonicalNodeId.split(' ').filter(Boolean);
        let nextNodes = state.nodes;
        let didExpandPath = false;
        for (let i = 1; i <= pathTokens.length; i += 1) {
          const pathNodeId = pathTokens.slice(0, i).join(' ');
          const pathNode = nextNodes[pathNodeId];
          if (!pathNode || pathNode.isExpanded) continue;
          if (!didExpandPath) {
            nextNodes = { ...nextNodes };
            didExpandPath = true;
          }
          nextNodes[pathNodeId] = { ...pathNode, isExpanded: true };
        }

        if (state.activeRootEntryNodeId === canonicalNodeId && !didExpandPath) return state;
        didUpdate = true;
        return {
          activeRootEntryNodeId: canonicalNodeId,
          ...(didExpandPath ? { nodes: nextNodes } : {}),
        };
      });
      if (didUpdate) queueDraftSave();
    },

    setActiveSectionId: (sectionId: string | null) => {
      let didUpdate = false;
      set((state) => {
        if (sectionId && !state.sectionsById[sectionId]) return state;
        if (state.activeSectionId === sectionId) return state;
        didUpdate = true;
        return { activeSectionId: sectionId };
      });
      if (didUpdate) queueDraftSave();
    },

    setActiveSmartViewId: (smartViewId: string | null) => {
      let didUpdate = false;
      set((state) => {
        if (!smartViewId) {
          if (state.activeSmartViewId === null) return state;
          didUpdate = true;
          return { activeSmartViewId: null };
        }
        const knownSmartView = isBuiltInSmartViewId(smartViewId) || !!state.customSmartViewsById[smartViewId];
        if (!knownSmartView || state.activeSmartViewId === smartViewId) return state;
        didUpdate = true;
        return { activeSmartViewId: smartViewId };
      });
      if (didUpdate) queueDraftSave();
    },

    toggleSectionExpanded: (sectionId: string) => {
      let didUpdate = false;
      set((state) => {
        if (!state.sectionsById[sectionId]) return state;
        const isExpanded = state.sectionExpandedById[sectionId] ?? true;
        didUpdate = true;
        return {
          sectionExpandedById: {
            ...state.sectionExpandedById,
            [sectionId]: !isExpanded,
          },
        };
      });
      if (didUpdate) queueDraftSave();
    },

    setSectionExpanded: (sectionId: string, expanded: boolean) => {
      let didUpdate = false;
      set((state) => {
        if (!state.sectionsById[sectionId]) return state;
        if ((state.sectionExpandedById[sectionId] ?? true) === expanded) return state;
        didUpdate = true;
        return {
          sectionExpandedById: {
            ...state.sectionExpandedById,
            [sectionId]: expanded,
          },
        };
      });
      if (didUpdate) queueDraftSave();
    },

    getSectionChildren: (parentId: string | null) => {
      const state = get();
      const derived = getDerivedIndexes(state);
      const sectionIds = derived.sectionChildIdsByParentId[sectionParentKey(parentId)] ?? [];
      return sectionIds
        .map((sectionId) => state.sectionsById[sectionId])
        .filter((section): section is SectionRecord => !!section);
    },

    getSectionTree: () => {
      const state = get();
      const derived = getDerivedIndexes(state);
      return buildSectionTreeFromChildMap(state.sectionsById, derived.sectionChildIdsByParentId, null);
    },

    getSectionPath: (sectionId: string) => {
      const { sectionsById } = get();
      return buildSectionPath(sectionsById, sectionId);
    },

    getSectionNodeCount: (sectionId: string) => {
      const state = get();
      if (!state.sectionsById[sectionId]) return 0;
      const derived = getDerivedIndexes(state);
      return derived.sectionNodeCountBySectionId[sectionId] ?? 0;
    },

    getEffectiveSectionIds: (nodeId: string) => {
      const state = get();
      const canonicalNodeId = canonicalizeNodeId(nodeId);
      if (!canonicalNodeId || !state.nodes[canonicalNodeId]) return [];
      const derived = getDerivedIndexes(state);
      return derived.effectiveSectionIdsByNode[canonicalNodeId] ?? [];
    },

    getSubtreeRulesForNode: (nodeId: string) => {
      const state = get();
      const canonicalNodeId = canonicalizeNodeId(nodeId);
      const derived = getDerivedIndexes(state);
      return (derived.rulesByRootNodeId[canonicalNodeId] ?? [])
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },

    getPrimaryMatchedNodeIds: () => {
      const state = get();
      const derived = getDerivedIndexes(state);
      const nodeIds = Object.keys(state.nodes);
      if (
        state.leftPrimaryMode === 'roots'
        && state.activeRootEntryNodeId
        && state.nodes[state.activeRootEntryNodeId]
      ) {
        return nodeIds.filter((nodeId) => isNodeWithinSubtree(nodeId, state.activeRootEntryNodeId as string));
      }
      if (state.leftPrimaryMode === 'sections' && state.activeSectionId && state.sectionsById[state.activeSectionId]) {
        return nodeIds.filter((nodeId) =>
          (derived.effectiveSectionIdsByNode[nodeId] ?? []).includes(state.activeSectionId as string),
        );
      }
      if (state.leftPrimaryMode === 'smartViews' && state.activeSmartViewId) {
        return nodeIds.filter((nodeId) => evalSmartViewById(nodeId, state.activeSmartViewId as string, {
          ...state,
          effectiveSectionIdsByNode: derived.effectiveSectionIdsByNode,
        }));
      }
      return nodeIds;
    },

    getDisplayNodeIdsWithAncestors: () => {
      const state = get();
      const matchedNodeIds = state.getPrimaryMatchedNodeIds();
      if (
        state.leftPrimaryMode === 'roots'
        && state.activeRootEntryNodeId
        && state.nodes[state.activeRootEntryNodeId]
      ) {
        return matchedNodeIds;
      }
      return buildDisplayNodeIdsWithAncestors(matchedNodeIds, state.nodes);
    },

    getSmartViews: () => {
      const { customSmartViewsById, customSmartViewOrder, smartViewPinnedById } = get();
      return buildSmartViews(customSmartViewsById, customSmartViewOrder, smartViewPinnedById);
    },

    evalSmartView: (nodeId: string, smartViewId: string) => {
      const state = get();
      const canonicalNodeId = canonicalizeNodeId(nodeId);
      if (!state.nodes[canonicalNodeId]) return false;
      const derived = getDerivedIndexes(state);
      return evalSmartViewById(canonicalNodeId, smartViewId, {
        ...state,
        effectiveSectionIdsByNode: derived.effectiveSectionIdsByNode,
      });
    },

    getSmartViewCount: (smartViewId: string) => {
      const state = get();
      const countMap = getSmartViewCountMap(state);
      return countMap[smartViewId] ?? 0;
    },

    undo: () => {
      let didUndo = false;
      set((state) => {
        if (state.undoStack.length === 0) return state;
        const previousSnapshot = state.undoStack[state.undoStack.length - 1];
        const currentSnapshot = createHistorySnapshot(state);
        const nextUndoStack = state.undoStack.slice(0, -1);
        const nextRedoStack = pushUndoStack(state.redoStack, currentSnapshot);
        didUndo = true;
        return {
          ...applyHistorySnapshot(previousSnapshot),
          undoStack: nextUndoStack,
          redoStack: nextRedoStack,
          canUndo: nextUndoStack.length > 0,
          canRedo: nextRedoStack.length > 0,
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });
      if (didUndo) queueDraftSave();
    },

    redo: () => {
      let didRedo = false;
      set((state) => {
        if (state.redoStack.length === 0) return state;
        const nextSnapshot = state.redoStack[state.redoStack.length - 1];
        const currentSnapshot = createHistorySnapshot(state);
        const nextRedoStack = state.redoStack.slice(0, -1);
        const nextUndoStack = pushUndoStack(state.undoStack, currentSnapshot);
        didRedo = true;
        return {
          ...applyHistorySnapshot(nextSnapshot),
          undoStack: nextUndoStack,
          redoStack: nextRedoStack,
          canUndo: nextUndoStack.length > 0,
          canRedo: nextRedoStack.length > 0,
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });
      if (didRedo) queueDraftSave();
    },

    flushDraftSave,

    clearDraft: () => {
      if (draftSaveTimer) {
        clearTimeout(draftSaveTimer);
        draftSaveTimer = null;
      }
      removeDraftPayload();
      set({
        lastDraftSavedAt: null,
        isDraftSaving: false,
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
      });
    },
  };
});
