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

interface SectionMutationResult {
  ok: boolean;
  sectionId?: string;
  error?: string;
}

interface DraftPayload {
  version: number;
  savedAt: string;
  nodes: Record<string, BiddingNode>;
  selectedNodeId: string | null;
  sectionsById?: Record<string, SectionRecord>;
  sectionRootOrder?: string[];
  leftPrimaryMode?: LeftPrimaryMode;
  activeSectionId?: string | null;
  activeSmartViewId?: string | null;
}

interface BiddingState {
  nodes: Record<string, BiddingNode>;
  selectedNodeId: string | null;
  sectionsById: Record<string, SectionRecord>;
  sectionRootOrder: string[];
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
  setLeftPrimaryMode: (mode: LeftPrimaryMode) => void;
  setActiveSectionId: (sectionId: string | null) => void;
  setActiveSmartViewId: (smartViewId: string | null) => void;
  getSectionChildren: (parentId: string | null) => SectionRecord[];
  getSectionTree: () => SectionTreeNode[];
  getSectionPath: (sectionId: string) => SectionRecord[];
  flushDraftSave: () => void;
  clearDraft: () => void;
}

const DRAFT_STORAGE_KEY = 'bridge-system-editor:draft:v1';
const DRAFT_VERSION = 1;
const DRAFT_SAVE_DEBOUNCE_MS = 900;
const SECTION_NAME_MAX_LENGTH = 64;
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

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
const initialSectionRootOrder = initialDraft?.sectionRootOrder && Array.isArray(initialDraft.sectionRootOrder)
  ? initialDraft.sectionRootOrder.filter((sectionId) => !!initialSectionsById[sectionId])
  : getSectionRootOrder(initialSectionsById);
const initialLeftPrimaryMode: LeftPrimaryMode = initialDraft?.leftPrimaryMode ?? 'roots';
const initialActiveSectionId = initialDraft?.activeSectionId && initialSectionsById[initialDraft.activeSectionId]
  ? initialDraft.activeSectionId
  : null;
const initialActiveSmartViewId = initialDraft?.activeSmartViewId ?? null;

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

        didAdd = true;
        return { nodes: updatedNodes, selectedNodeId: id, hasUnsavedChanges: true, serverSyncError: null };
      });

      if (didAdd) queueDraftSave();
    },

    updateNode: (id: string, updates: Partial<BiddingNode>) => {
      let didUpdate = false;

      set((state) => {
        if (!state.nodes[id]) return state;
        didUpdate = true;

        return {
          nodes: {
            ...state.nodes,
            [id]: { ...state.nodes[id], ...updates },
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

        didRename = true;
        return {
          nodes: newNodes,
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

        return {
          nodes: newNodes,
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
        return {
          sectionsById: nextSectionsById,
          sectionRootOrder: getSectionRootOrder(nextSectionsById),
          activeSectionId: state.activeSectionId === sectionId ? targetParentId : state.activeSectionId,
          hasUnsavedChanges: true,
          serverSyncError: null,
        };
      });

      if (didDelete) queueDraftSave();
      return result;
    },

    setLeftPrimaryMode: (mode: LeftPrimaryMode) => set({ leftPrimaryMode: mode }),

    setActiveSectionId: (sectionId: string | null) => set((state) => {
      if (sectionId && !state.sectionsById[sectionId]) return state;
      return { activeSectionId: sectionId };
    }),

    setActiveSmartViewId: (smartViewId: string | null) => set({ activeSmartViewId: smartViewId }),

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
