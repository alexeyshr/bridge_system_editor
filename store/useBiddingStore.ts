import { create } from 'zustand';
import yaml from 'js-yaml';

export interface BiddingNode {
  id: string;
  context: {
    sequence: string[];
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
  | 'sv_recently_edited';

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

interface DraftPayload {
  version: number;
  savedAt: string;
  nodes: Record<string, BiddingNode>;
  selectedNodeId: string | null;
  sectionsById?: Record<string, SectionRecord>;
  sectionRootOrder?: string[];
  nodeSectionIds?: Record<string, string[]>;
  subtreeRulesById?: Record<string, SubtreeRuleRecord>;
  customSmartViewsById?: Record<string, CustomSmartViewRecord>;
  customSmartViewOrder?: string[];
  smartViewPinnedById?: Record<string, boolean>;
  nodeTouchedAtById?: Record<string, string>;
  leftPrimaryMode?: LeftPrimaryMode;
  activeSectionId?: string | null;
  activeSmartViewId?: string | null;
}

interface BiddingState {
  nodes: Record<string, BiddingNode>;
  selectedNodeId: string | null;
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
  hasUnsavedChanges: boolean;
  isDraftSaving: boolean;
  isServerSyncing: boolean;
  serverSyncError: string | null;
  lastDraftSavedAt: string | null;
  lastServerSavedAt: string | null;
  lastExportedAt: string | null;

  // Actions
  importYaml: (yamlString: string) => void;
  exportYaml: () => string;
  addNode: (parentId: string | null, call: string) => void;
  updateNode: (id: string, updates: Partial<BiddingNode>) => void;
  renameNode: (id: string, newCall: string) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  toggleExpand: (id: string) => void;
  setSearchQuery: (query: string) => void;
  toggleBookmark: (id: string) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
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
  setActiveSectionId: (sectionId: string | null) => void;
  setActiveSmartViewId: (smartViewId: string | null) => void;
  toggleSectionExpanded: (sectionId: string) => void;
  setSectionExpanded: (sectionId: string, expanded: boolean) => void;
  getSectionChildren: (parentId: string | null) => SectionRecord[];
  getSectionTree: () => SectionTreeNode[];
  getSectionPath: (sectionId: string) => SectionRecord[];
  getEffectiveSectionIds: (nodeId: string) => string[];
  getSubtreeRulesForNode: (nodeId: string) => SubtreeRuleRecord[];
  getSmartViews: () => SmartViewDescriptor[];
  evalSmartView: (nodeId: string, smartViewId: string) => boolean;
  getSmartViewCount: (smartViewId: string) => number;
  flushDraftSave: () => void;
  clearDraft: () => void;
}

const DRAFT_STORAGE_KEY = 'bridge-system-editor:draft:v1';
const DRAFT_VERSION = 1;
const DRAFT_SAVE_DEBOUNCE_MS = 900;
const SECTION_NAME_MAX_LENGTH = 64;
const SMART_VIEW_NAME_MAX_LENGTH = 64;
const SMART_VIEW_QUERY_MAX_LENGTH = 160;
const RECENTLY_EDITED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

const BUILTIN_SMART_VIEWS: Array<{ id: BuiltInSmartViewId; name: string; order: number }> = [
  { id: 'sv_unassigned', name: 'Unassigned', order: 0 },
  { id: 'sv_bookmarked', name: 'Bookmarked', order: 1 },
  { id: 'sv_no_notes', name: 'No notes', order: 2 },
  { id: 'sv_unaccepted', name: 'Unaccepted', order: 3 },
  { id: 'sv_recently_edited', name: 'Recently edited', order: 4 },
];

function clampIndex(index: number, max: number): number {
  if (!Number.isFinite(index)) return max;
  if (index < 0) return 0;
  if (index > max) return max;
  return Math.floor(index);
}

function normalizeSectionName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
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

function buildSectionTree(
  sectionsById: Record<string, SectionRecord>,
  parentId: string | null,
): SectionTreeNode[] {
  return getSiblingIdsSorted(sectionsById, parentId).map((sectionId) => ({
    section: sectionsById[sectionId],
    children: buildSectionTree(sectionsById, sectionId),
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
  const sequenceText = node.context.sequence.join(' ');
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
): string[] {
  const direct = nodeSectionIds[nodeId] ?? [];
  const fromRules = Object.values(subtreeRulesById)
    .filter((rule) => isNodeWithinSubtree(nodeId, rule.rootNodeId))
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
  >,
): boolean {
  const node = state.nodes[nodeId];
  if (!node) return false;

  if (isBuiltInSmartViewId(smartViewId)) {
    if (smartViewId === 'sv_unassigned') {
      return getEffectiveSectionIdsForNode(nodeId, state.nodeSectionIds, state.subtreeRulesById).length === 0;
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
    return false;
  }

  const custom = state.customSmartViewsById[smartViewId];
  if (!custom) return false;
  return matchesCustomSmartViewQuery(node, custom.query, custom.field);
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
  const parsedNodes: Record<string, BiddingNode> = {};
  try {
    const parsed = yaml.load(defaultSystem) as any[];
    if (Array.isArray(parsed)) {
      parsed.forEach((node) => {
        if (node.id && node.context?.sequence) {
          parsedNodes[node.id] = {
            ...node,
            isExpanded: true,
            isBookmarked: false,
          };
        }
      });
    }
  } catch (e) {
    console.error('Failed to parse default system', e);
  }
  return parsedNodes;
}

function toNodeFromRemote(sequenceId: string, payload: unknown): BiddingNode {
  const fallbackSequence = sequenceId.split(' ').filter(Boolean);
  const payloadObj =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  const contextObj =
    payloadObj.context && typeof payloadObj.context === 'object' && !Array.isArray(payloadObj.context)
      ? (payloadObj.context as Record<string, unknown>)
      : {};

  const payloadSequence = Array.isArray(contextObj.sequence)
    ? contextObj.sequence.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  const sequence = payloadSequence.length > 0 ? payloadSequence : fallbackSequence;
  const nodeId = sequence.join(' ');

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
const initialNodes = initialDraft?.nodes && Object.keys(initialDraft.nodes).length > 0
  ? initialDraft.nodes
  : parseDefaultNodes();
const initialSectionsById = initialDraft?.sectionsById && typeof initialDraft.sectionsById === 'object'
  ? initialDraft.sectionsById
  : {};
const initialNodeSectionIdsRaw = initialDraft?.nodeSectionIds && typeof initialDraft.nodeSectionIds === 'object'
  ? initialDraft.nodeSectionIds
  : {};
const initialNodeSectionIds: Record<string, string[]> = {};
Object.entries(initialNodeSectionIdsRaw).forEach(([nodeId, sectionIds]) => {
  if (!initialNodes[nodeId] || !Array.isArray(sectionIds)) return;
  const normalized = normalizeSectionIdList(
    sectionIds.filter((sectionId): sectionId is string => typeof sectionId === 'string')
      .filter((sectionId) => !!initialSectionsById[sectionId]),
  );
  if (normalized.length > 0) {
    initialNodeSectionIds[nodeId] = normalized;
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
  if (!rule.rootNodeId || !initialNodes[rule.rootNodeId]) return;
  const timestamp = typeof rule.createdAt === 'string' && rule.createdAt ? rule.createdAt : new Date().toISOString();
  initialSubtreeRulesById[ruleId] = {
    id: ruleId,
    sectionId: rule.sectionId,
    rootNodeId: rule.rootNodeId,
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
  if (!initialNodes[nodeId] || typeof touchedAt !== 'string' || !touchedAt) return;
  initialNodeTouchedAtById[nodeId] = touchedAt;
});
const initialSectionRootOrder = initialDraft?.sectionRootOrder && Array.isArray(initialDraft.sectionRootOrder)
  ? initialDraft.sectionRootOrder.filter((sectionId) => !!initialSectionsById[sectionId])
  : getSectionRootOrder(initialSectionsById);
const initialLeftPrimaryModeRaw: LeftPrimaryMode = initialDraft?.leftPrimaryMode ?? 'roots';
const initialActiveSectionId = initialDraft?.activeSectionId && initialSectionsById[initialDraft.activeSectionId]
  ? initialDraft.activeSectionId
  : null;
const initialActiveSmartViewId = initialDraft?.activeSmartViewId
  && (builtInSmartViewIdSet.has(initialDraft.activeSmartViewId as BuiltInSmartViewId)
    || initialCustomSmartViewsById[initialDraft.activeSmartViewId])
  ? initialDraft.activeSmartViewId
  : null;
const initialLeftPrimaryMode: LeftPrimaryMode =
  initialLeftPrimaryModeRaw === 'sections' && !initialActiveSectionId
    ? 'roots'
    : initialLeftPrimaryModeRaw === 'smartViews' && !initialActiveSmartViewId
      ? 'roots'
      : initialLeftPrimaryModeRaw;
const initialSectionExpandedById: Record<string, boolean> = Object.fromEntries(
  Object.keys(initialSectionsById).map((sectionId) => [sectionId, true]),
);

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
    });
    set({ isDraftSaving: false, lastDraftSavedAt: savedAt });
  };

  return {
    nodes: initialNodes,
    selectedNodeId: initialDraft?.selectedNodeId ?? null,
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
    searchQuery: '',
    isLeftPanelOpen: true,
    isRightPanelOpen: true,
    hasUnsavedChanges: !!initialDraft,
    isDraftSaving: false,
    isServerSyncing: false,
    serverSyncError: null,
    lastDraftSavedAt: initialDraft?.savedAt ?? null,
    lastServerSavedAt: null,
    lastExportedAt: null,

    importYaml: (yamlString: string) => {
      try {
        const parsed = yaml.load(yamlString) as any[];
        if (!Array.isArray(parsed)) throw new Error('Invalid YAML format: expected an array of nodes.');

        const newNodes: Record<string, BiddingNode> = {};
        parsed.forEach((node) => {
          if (node.id && node.context && node.context.sequence) {
            const isExpanded = node.context.sequence.length <= 2;
            newNodes[node.id] = { ...node, isExpanded };
          }
        });

        set({
          nodes: newNodes,
          selectedNodeId: null,
          sectionsById: {},
          sectionRootOrder: [],
          nodeSectionIds: {},
          subtreeRulesById: {},
          customSmartViewsById: {},
          customSmartViewOrder: [],
          smartViewPinnedById: {},
          nodeTouchedAtById: {},
          sectionExpandedById: {},
          activeSectionId: null,
          activeSmartViewId: null,
          leftPrimaryMode: 'roots',
          hasUnsavedChanges: true,
          serverSyncError: null,
          lastExportedAt: null,
        });
        queueDraftSave();
      } catch (e) {
        console.error('Failed to parse YAML', e);
        alert('Failed to parse YAML');
      }
    },

    exportYaml: () => {
      const { nodes } = get();
      const exportedAt = new Date().toISOString();

      const exportData = Object.values(nodes).map((node) => {
        const { isExpanded, isBookmarked, ...rest } = node;
        return rest;
      });

      set({ lastExportedAt: exportedAt });
      flushDraftSave();

      return yaml.dump(exportData);
    },

    addNode: (parentId: string | null, call: string) => {
      let didAdd = false;

      set((state) => {
        const parentNode = parentId ? state.nodes[parentId] : null;
        const sequence = parentNode ? [...parentNode.context.sequence, call] : [call];
        const id = sequence.join(' ');

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
        if (parentId && updatedNodes[parentId]) {
          updatedNodes[parentId] = { ...updatedNodes[parentId], isExpanded: true };
        }
        const touchedAt = new Date().toISOString();

        didAdd = true;
        return {
          nodes: updatedNodes,
          nodeTouchedAtById: {
            ...state.nodeTouchedAtById,
            [id]: touchedAt,
          },
          selectedNodeId: id,
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });

      if (didAdd) queueDraftSave();
    },

    updateNode: (id: string, updates: Partial<BiddingNode>) => {
      let didUpdate = false;

      set((state) => {
        if (!state.nodes[id]) return state;
        didUpdate = true;
        const touchedAt = new Date().toISOString();

        return {
          nodes: {
            ...state.nodes,
            [id]: { ...state.nodes[id], ...updates },
          },
          nodeTouchedAtById: {
            ...state.nodeTouchedAtById,
            [id]: touchedAt,
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });

      if (didUpdate) queueDraftSave();
    },

    renameNode: (id: string, newCall: string) => {
      let didRename = false;

      set((state) => {
        if (!state.nodes[id]) return state;

        const node = state.nodes[id];
        const oldSequence = [...node.context.sequence];
        const newSequence = [...oldSequence];
        newSequence[newSequence.length - 1] = newCall;

        const newId = newSequence.join(' ');

        if (state.nodes[newId] && newId !== id) {
          alert('A sequence with this call already exists.');
          return state;
        }

        const newNodes = { ...state.nodes };

        const prefix = id + ' ';
        const newPrefix = newId + ' ';

        Object.keys(state.nodes).forEach((key) => {
          if (key === id) {
            newNodes[newId] = {
              ...state.nodes[id],
              id: newId,
              context: {
                ...state.nodes[id].context,
                sequence: newSequence,
              },
            };
            delete newNodes[id];
          } else if (key.startsWith(prefix)) {
            const suffix = key.substring(prefix.length);
            const childNewId = newPrefix + suffix;
            const childOldSequence = state.nodes[key].context.sequence;

            const childNewSequence = [...childOldSequence];
            childNewSequence[newSequence.length - 1] = newCall;

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

        const nextNodeSectionIds = remapNodeIdMapForRename(state.nodeSectionIds, id, newId);
        const nextNodeTouchedAtById = remapNodeIdMapForRename(state.nodeTouchedAtById, id, newId);
        const nextSubtreeRulesById = Object.fromEntries(
          Object.entries(state.subtreeRulesById).map(([ruleId, rule]) => {
            if (rule.rootNodeId === id) {
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
        return {
          nodes: newNodes,
          nodeSectionIds: nextNodeSectionIds,
          nodeTouchedAtById: nextNodeTouchedAtById,
          subtreeRulesById: nextSubtreeRulesById,
          hasUnsavedChanges: true,
          serverSyncError: null,
          selectedNodeId: state.selectedNodeId === id
            ? newId
            : state.selectedNodeId?.startsWith(prefix)
              ? newPrefix + state.selectedNodeId.substring(prefix.length)
              : state.selectedNodeId,
        };
      });

      if (didRename) queueDraftSave();
    },

    deleteNode: (id: string) => {
      let didDelete = false;

      set((state) => {
        const newNodes = { ...state.nodes };
        const prefix = id + ' ';

        Object.keys(newNodes).forEach((key) => {
          if (key === id || key.startsWith(prefix)) {
            delete newNodes[key];
            didDelete = true;
          }
        });

        if (!didDelete) return state;

        const nextNodeSectionIds = Object.fromEntries(
          Object.entries(state.nodeSectionIds).filter(([nodeId]) => !isNodeWithinSubtree(nodeId, id)),
        ) as Record<string, string[]>;

        const nextSubtreeRulesById = Object.fromEntries(
          Object.entries(state.subtreeRulesById).filter(([, rule]) => !isNodeWithinSubtree(rule.rootNodeId, id)),
        ) as Record<string, SubtreeRuleRecord>;
        const nextNodeTouchedAtById = Object.fromEntries(
          Object.entries(state.nodeTouchedAtById).filter(([nodeId]) => !isNodeWithinSubtree(nodeId, id)),
        ) as Record<string, string>;

        return {
          nodes: newNodes,
          nodeSectionIds: nextNodeSectionIds,
          nodeTouchedAtById: nextNodeTouchedAtById,
          subtreeRulesById: nextSubtreeRulesById,
          hasUnsavedChanges: true,
          serverSyncError: null,
          selectedNodeId: state.selectedNodeId === id || state.selectedNodeId?.startsWith(prefix)
            ? null
            : state.selectedNodeId,
        };
      });

      if (didDelete) queueDraftSave();
    },

    selectNode: (id: string | null) => set({ selectedNodeId: id }),

    toggleExpand: (id: string) => set((state) => {
      if (!state.nodes[id]) return state;
      return {
        nodes: {
          ...state.nodes,
          [id]: { ...state.nodes[id], isExpanded: !state.nodes[id].isExpanded },
        },
      };
    }),

    setSearchQuery: (query: string) => set({ searchQuery: query }),

    toggleBookmark: (id: string) => set((state) => {
      if (!state.nodes[id]) return state;
      return {
        nodes: {
          ...state.nodes,
          [id]: { ...state.nodes[id], isBookmarked: !state.nodes[id].isBookmarked },
        },
      };
    }),

    toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
    toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),

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

        return {
          nodes: remoteNodes,
          selectedNodeId,
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
        return {
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
        };
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
        return {
          sectionsById: nextSectionsById,
          sectionRootOrder: getSectionRootOrder(nextSectionsById),
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
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
        return {
          sectionsById: nextSectionsById,
          sectionRootOrder: getSectionRootOrder(nextSectionsById),
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
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
        return {
          sectionsById: nextSectionsById,
          sectionRootOrder: getSectionRootOrder(nextSectionsById),
          nodeSectionIds: nextNodeSectionIds,
          subtreeRulesById: nextSubtreeRulesById,
          sectionExpandedById: nextExpandedById,
          activeSectionId: state.activeSectionId === sectionId ? targetParentId : state.activeSectionId,
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });

      if (didDelete) queueDraftSave();
      return result;
    },

    assignNodeToSection: (nodeId: string, sectionId: string) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to assign section.' };
      let didAssign = false;

      set((state) => {
        if (!state.nodes[nodeId]) {
          result = { ok: false, error: 'Node not found.' };
          return state;
        }
        if (!state.sectionsById[sectionId]) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }

        const existing = state.nodeSectionIds[nodeId] ?? [];
        if (existing.includes(sectionId)) {
          result = { ok: true };
          return state;
        }

        didAssign = true;
        result = { ok: true };
        return {
          nodeSectionIds: {
            ...state.nodeSectionIds,
            [nodeId]: [...existing, sectionId],
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });

      if (didAssign) queueDraftSave();
      return result;
    },

    unassignNodeFromSection: (nodeId: string, sectionId: string) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to unassign section.' };
      let didUnassign = false;

      set((state) => {
        if (!state.nodes[nodeId]) {
          result = { ok: false, error: 'Node not found.' };
          return state;
        }
        if (!state.sectionsById[sectionId]) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }

        const existing = state.nodeSectionIds[nodeId] ?? [];
        if (!existing.includes(sectionId)) {
          result = { ok: true };
          return state;
        }

        const nextIds = existing.filter((id) => id !== sectionId);
        const nextNodeSectionIds = { ...state.nodeSectionIds };
        if (nextIds.length > 0) {
          nextNodeSectionIds[nodeId] = nextIds;
        } else {
          delete nextNodeSectionIds[nodeId];
        }

        didUnassign = true;
        result = { ok: true };
        return {
          nodeSectionIds: nextNodeSectionIds,
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });

      if (didUnassign) queueDraftSave();
      return result;
    },

    setNodeSections: (nodeId: string, sectionIds: string[]) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to set node sections.' };
      let didSet = false;

      set((state) => {
        if (!state.nodes[nodeId]) {
          result = { ok: false, error: 'Node not found.' };
          return state;
        }

        const normalized = normalizeSectionIdList(sectionIds);
        const hasMissingSection = normalized.some((sectionId) => !state.sectionsById[sectionId]);
        if (hasMissingSection) {
          result = { ok: false, error: 'One or more sections were not found.' };
          return state;
        }

        const previous = state.nodeSectionIds[nodeId] ?? [];
        if (previous.length === normalized.length && previous.every((id, index) => id === normalized[index])) {
          result = { ok: true };
          return state;
        }

        const nextNodeSectionIds = { ...state.nodeSectionIds };
        if (normalized.length > 0) {
          nextNodeSectionIds[nodeId] = normalized;
        } else {
          delete nextNodeSectionIds[nodeId];
        }

        didSet = true;
        result = { ok: true };
        return {
          nodeSectionIds: nextNodeSectionIds,
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });

      if (didSet) queueDraftSave();
      return result;
    },

    createSubtreeRule: (sectionId: string, rootNodeId: string, includeFutureDescendants = true) => {
      let result: AssignmentMutationResult = { ok: false, error: 'Failed to create subtree rule.' };
      let didCreate = false;

      set((state) => {
        if (!state.sectionsById[sectionId]) {
          result = { ok: false, error: 'Section not found.' };
          return state;
        }
        if (!state.nodes[rootNodeId]) {
          result = { ok: false, error: 'Root node not found.' };
          return state;
        }

        const existingRule = Object.values(state.subtreeRulesById).find(
          (rule) => rule.sectionId === sectionId && rule.rootNodeId === rootNodeId,
        );
        if (existingRule) {
          result = { ok: true, ruleId: existingRule.id };
          return state;
        }

        const ruleId = nextSubtreeRuleId(state.subtreeRulesById);
        const timestamp = new Date().toISOString();
        didCreate = true;
        result = { ok: true, ruleId };

        return {
          subtreeRulesById: {
            ...state.subtreeRulesById,
            [ruleId]: {
              id: ruleId,
              sectionId,
              rootNodeId,
              includeFutureDescendants,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
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
        return {
          subtreeRulesById: nextRules,
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
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

        return {
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
        };
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
        return {
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
        };
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
        return {
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
        };
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
        return {
          smartViewPinnedById: {
            ...state.smartViewPinnedById,
            [smartViewId]: nextPinned,
          },
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });

      if (didToggle) queueDraftSave();
      return result;
    },

    setLeftPrimaryMode: (mode: LeftPrimaryMode) => set({ leftPrimaryMode: mode }),

    setActiveSectionId: (sectionId: string | null) => set((state) => {
      if (sectionId && !state.sectionsById[sectionId]) return state;
      return { activeSectionId: sectionId };
    }),

    setActiveSmartViewId: (smartViewId: string | null) => set((state) => {
      if (!smartViewId) return { activeSmartViewId: null };
      const knownSmartView = isBuiltInSmartViewId(smartViewId) || !!state.customSmartViewsById[smartViewId];
      if (!knownSmartView) return state;
      return { activeSmartViewId: smartViewId };
    }),

    toggleSectionExpanded: (sectionId: string) => set((state) => {
      if (!state.sectionsById[sectionId]) return state;
      const isExpanded = state.sectionExpandedById[sectionId] ?? true;
      return {
        sectionExpandedById: {
          ...state.sectionExpandedById,
          [sectionId]: !isExpanded,
        },
      };
    }),

    setSectionExpanded: (sectionId: string, expanded: boolean) => set((state) => {
      if (!state.sectionsById[sectionId]) return state;
      return {
        sectionExpandedById: {
          ...state.sectionExpandedById,
          [sectionId]: expanded,
        },
      };
    }),

    getSectionChildren: (parentId: string | null) => {
      const { sectionsById } = get();
      return getSiblingIdsSorted(sectionsById, parentId).map((sectionId) => sectionsById[sectionId]);
    },

    getSectionTree: () => {
      const { sectionsById } = get();
      return buildSectionTree(sectionsById, null);
    },

    getSectionPath: (sectionId: string) => {
      const { sectionsById } = get();
      return buildSectionPath(sectionsById, sectionId);
    },

    getEffectiveSectionIds: (nodeId: string) => {
      const { sectionsById, nodeSectionIds, subtreeRulesById } = get();
      if (!nodeId) return [];
      const merged = getEffectiveSectionIdsForNode(nodeId, nodeSectionIds, subtreeRulesById);
      return merged.filter((sectionId) => !!sectionsById[sectionId]);
    },

    getSubtreeRulesForNode: (nodeId: string) => {
      const { sectionsById, subtreeRulesById } = get();
      return Object.values(subtreeRulesById)
        .filter((rule) => rule.rootNodeId === nodeId && !!sectionsById[rule.sectionId])
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },

    getSmartViews: () => {
      const { customSmartViewsById, customSmartViewOrder, smartViewPinnedById } = get();
      return buildSmartViews(customSmartViewsById, customSmartViewOrder, smartViewPinnedById);
    },

    evalSmartView: (nodeId: string, smartViewId: string) => {
      const state = get();
      return evalSmartViewById(nodeId, smartViewId, state);
    },

    getSmartViewCount: (smartViewId: string) => {
      const state = get();
      return Object.keys(state.nodes).reduce((count, nodeId) => (
        evalSmartViewById(nodeId, smartViewId, state) ? count + 1 : count
      ), 0);
    },

    flushDraftSave,

    clearDraft: () => {
      if (draftSaveTimer) {
        clearTimeout(draftSaveTimer);
        draftSaveTimer = null;
      }
      removeDraftPayload();
      set({ lastDraftSavedAt: null, isDraftSaving: false });
    },
  };
});
