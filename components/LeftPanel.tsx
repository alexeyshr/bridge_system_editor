import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import {
  useBiddingStore,
  type CustomSmartViewField,
  type BiddingNode,
  type SectionMutationResult,
  type SmartViewMutationResult,
  type SectionTreeNode,
} from '@/store/useBiddingStore';
import { compareSequences, formatCall, getSuitColor } from '@/lib/utils';
import {
  buildSequenceIdFromSteps,
  normalizeBiddingCall,
  type BiddingStep,
} from '@/lib/bidding-steps';
import { getMutationIntentUiMeta } from '@/lib/domain/bidding/mutation-intents';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';

type SectionModalState =
  | { mode: 'create'; parentId: string | null; title: string; confirmText: string; initialValue: string }
  | { mode: 'rename'; sectionId: string; title: string; confirmText: string; initialValue: string }
  | { mode: 'delete'; sectionId: string; title: string; confirmText: string; initialValue: '' };

type SmartViewModalState =
  | { mode: 'create'; smartViewId?: string; title: string; confirmText: string }
  | { mode: 'edit'; smartViewId: string; title: string; confirmText: string }
  | { mode: 'delete'; smartViewId: string; title: string; confirmText: string };

type RootDeleteDialogState = {
  nodeId: string;
  label: string;
} | null;

const ROOT_BID_CALLS = Array.from({ length: 7 }, (_, levelIdx) =>
  ['NT', 'S', 'H', 'D', 'C'].map((suit) => `${levelIdx + 1}${suit}`),
).flat();
const ROOT_SPECIAL_CALLS = ['Pass', 'X', 'XX'] as const;
const BID_SUITS = ['C', 'D', 'H', 'S', 'NT'] as const;
const ROOT_DISPLAY_SUITS = ['NT', 'S', 'H', 'D', 'C'] as const;
const ROOT_DISPLAY_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
type RootViewMode = 'matrix' | 'list';
type RootPickerMode = 'single' | 'sequence';
type SectionDropPlacement = 'before' | 'inside' | 'after';
type SectionDropHint = {
  targetSectionId: string;
  placement: SectionDropPlacement;
} | null;

function getSectionDropPlacement(event: DragEvent<HTMLElement>): SectionDropPlacement {
  const bounds = event.currentTarget.getBoundingClientRect();
  const relativeY = event.clientY - bounds.top;
  const threshold = Math.max(bounds.height * 0.28, 6);
  if (relativeY < threshold) return 'before';
  if (relativeY > bounds.height - threshold) return 'after';
  return 'inside';
}

function isBidCall(call: string): boolean {
  return /^([1-7])(C|D|H|S|NT)$/.test(call);
}

function getBidRank(call: string): number {
  const match = call.match(/^([1-7])(C|D|H|S|NT)$/);
  if (!match) return -1;
  const level = parseInt(match[1], 10);
  const suit = match[2] as (typeof BID_SUITS)[number];
  return (level - 1) * BID_SUITS.length + BID_SUITS.indexOf(suit);
}

function getLastContractBid(steps: BiddingStep[]): string | null {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const normalized = normalizeBiddingCall(steps[index].call);
    if (normalized && isBidCall(normalized)) return normalized;
  }
  return null;
}

function isSequenceCallAvailable(steps: BiddingStep[], call: string): boolean {
  const normalized = normalizeBiddingCall(call);
  if (!normalized) return false;

  if (steps.length === 0) {
    return isBidCall(normalized);
  }

  const lastNormalized = normalizeBiddingCall(steps[steps.length - 1].call);
  const lastBid = getLastContractBid(steps);
  const lastBidRank = lastBid ? getBidRank(lastBid) : -1;

  if (isBidCall(normalized)) {
    return getBidRank(normalized) > lastBidRank;
  }
  if (normalized === 'Pass') return true;
  if (normalized === 'X') return !!lastNormalized && isBidCall(lastNormalized);
  if (normalized === 'XX') return lastNormalized === 'X';
  return false;
}

function toErrorMessage(result: SectionMutationResult): string {
  if (result.ok) return '';
  return result.error || 'Operation failed.';
}

function toSmartViewErrorMessage(result: SmartViewMutationResult): string {
  if (result.ok) return '';
  return result.error || 'Operation failed.';
}

export function LeftPanel() {
  const {
    nodes,
    selectNode,
    addNode,
    addRootEntry,
    removeRootEntry,
    selectedNodeId,
    rootEntryNodeIds,
    activeRootEntryNodeId,
    leftPrimaryMode,
    activeSectionId,
    activeSmartViewId,
    sectionExpandedById,
    createSection,
    renameSection,
    moveSection,
    reorderSection,
    deleteSection,
    createCustomSmartView,
    updateCustomSmartView,
    deleteCustomSmartView,
    toggleSmartViewPinned,
    setLeftPrimaryMode,
    setActiveSectionId,
    setActiveSmartViewId,
    toggleSectionExpanded,
    setActiveRootEntryNodeId,
    sectionsById,
    getSectionChildren,
    getSectionTree,
    getSectionNodeCount,
    getSmartViews,
    getSmartViewCount,
    customSmartViewsById,
  } = useBiddingStore();

  const [actionMenuSectionId, setActionMenuSectionId] = useState<string | null>(null);
  const [actionMenuSmartViewId, setActionMenuSmartViewId] = useState<string | null>(null);
  const [sectionModal, setSectionModal] = useState<SectionModalState | null>(null);
  const [sectionModalInput, setSectionModalInput] = useState('');
  const [sectionModalError, setSectionModalError] = useState('');
  const [smartViewModal, setSmartViewModal] = useState<SmartViewModalState | null>(null);
  const [smartViewNameInput, setSmartViewNameInput] = useState('');
  const [smartViewQueryInput, setSmartViewQueryInput] = useState('');
  const [smartViewFieldInput, setSmartViewFieldInput] = useState<CustomSmartViewField>('all');
  const [smartViewModalError, setSmartViewModalError] = useState('');
  const [isRootsOpen, setIsRootsOpen] = useState(true);
  const [isOurRootsOpen, setIsOurRootsOpen] = useState(true);
  const [isSequenceOppRootsOpen, setIsSequenceOppRootsOpen] = useState(true);
  const [isSectionsOpen, setIsSectionsOpen] = useState(true);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(true);
  const [isSmartViewsOpen, setIsSmartViewsOpen] = useState(true);
  const [isRootPickerOpen, setIsRootPickerOpen] = useState(false);
  const [rootPickerMode, setRootPickerMode] = useState<RootPickerMode>('single');
  const [rootEditEntryNodeId, setRootEditEntryNodeId] = useState<string | null>(null);
  const [selectedRootCalls, setSelectedRootCalls] = useState<string[]>([]);
  const [rootPickerActor, setRootPickerActor] = useState<'our' | 'opp'>('our');
  const [sequenceRootSteps, setSequenceRootSteps] = useState<BiddingStep[]>([]);
  const [sequenceNextActor, setSequenceNextActor] = useState<'our' | 'opp'>('our');
  const [rootPickerError, setRootPickerError] = useState('');
  const [rootDeleteDialog, setRootDeleteDialog] = useState<RootDeleteDialogState>(null);
  const [rootViewMode, setRootViewMode] = useState<RootViewMode>('matrix');
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [sectionDropHint, setSectionDropHint] = useState<SectionDropHint>(null);
  const [sectionDragError, setSectionDragError] = useState('');

  const roots = useMemo(
    () => rootEntryNodeIds
      .map((nodeId) => nodes[nodeId])
      .filter((node): node is BiddingNode => !!node)
      .sort((a, b) => compareSequences(a.context.sequence, b.context.sequence)),
    [nodes, rootEntryNodeIds],
  );
  const rootsByCall = useMemo(
    () => new Map(
      roots
        .filter((root) => (
          root.context.sequence.length === 1
          && root.context.sequence[0]?.actor === 'our'
        ))
        .map((root) => [root.context.sequence[0].call, root]),
    ),
    [roots],
  );
  const activeRootNode = useMemo(
    () => (activeRootEntryNodeId ? nodes[activeRootEntryNodeId] ?? null : null),
    [activeRootEntryNodeId, nodes],
  );
  const selectedRootCall = useMemo(() => {
    if (!activeRootNode || activeRootNode.context.sequence.length !== 1) return null;
    const [rootStep] = activeRootNode.context.sequence;
    if (!rootStep || rootStep.actor !== 'our') return null;
    return rootsByCall.has(rootStep.call) ? rootStep.call : null;
  }, [activeRootNode, rootsByCall]);
  const bookmarks = useMemo(() => Object.values(nodes).filter((n) => n.isBookmarked), [nodes]);
  const sectionTree = getSectionTree();
  const smartViews = getSmartViews();
  const existingRootCallByActor = useMemo(
    () => new Set(
      roots
        .filter((root) => root.context.sequence.length === 1)
        .map((root) => `${root.context.sequence[0].actor}:${root.context.sequence[0].call}`),
    ),
    [roots],
  );
  const ourRoots = useMemo(
    () => roots.filter((root) => (
      root.context.sequence.length === 1 && root.context.sequence[0].actor === 'our'
    )),
    [roots],
  );
  const extraRoots = useMemo(
    () => roots.filter((root) => !(
      root.context.sequence.length === 1 && root.context.sequence[0].actor === 'our'
    )),
    [roots],
  );
  const selectedNodeLabel = useMemo(() => {
    if (!selectedNodeId || !nodes[selectedNodeId]) return '';
    return nodes[selectedNodeId].context.sequence
      .map((step) => (step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)))
      .join(' - ');
  }, [nodes, selectedNodeId]);
  const canAddSelectedNodeAsRoot = useMemo(
    () => !!selectedNodeId && !!nodes[selectedNodeId] && !roots.some((root) => root.id === selectedNodeId),
    [nodes, roots, selectedNodeId],
  );
  const sequencePreviewLabel = useMemo(
    () => sequenceRootSteps
      .map((step) => (step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)))
      .join(' - '),
    [sequenceRootSteps],
  );
  const sequenceFinalNodeId = useMemo(
    () => (sequenceRootSteps.length > 0 ? buildSequenceIdFromSteps(sequenceRootSteps) : null),
    [sequenceRootSteps],
  );
  const sequenceConflictsExistingRoot = useMemo(
    () => !!sequenceFinalNodeId && roots.some((root) => (
      root.id === sequenceFinalNodeId && root.id !== rootEditEntryNodeId
    )),
    [rootEditEntryNodeId, roots, sequenceFinalNodeId],
  );
  const canSubmitSingleMode = selectedRootCalls.length > 0;
  const canSubmitSequenceMode = sequenceRootSteps.length > 0 && !sequenceConflictsExistingRoot;
  const removeRootIntentMeta = getMutationIntentUiMeta('remove-root-entry');
  const editingRootLabel = useMemo(() => {
    if (!rootEditEntryNodeId) return '';
    const node = nodes[rootEditEntryNodeId];
    if (!node) return '';
    return node.context.sequence
      .map((step) => (step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)))
      .join(' - ');
  }, [nodes, rootEditEntryNodeId]);

  const openRootPicker = () => {
    setRootPickerError('');
    setRootPickerMode('single');
    setRootEditEntryNodeId(null);
    setSelectedRootCalls([]);
    setRootPickerActor('our');
    setSequenceRootSteps([]);
    setSequenceNextActor('our');
    setIsRootPickerOpen(true);
  };

  const closeRootPicker = () => {
    setIsRootPickerOpen(false);
    setRootPickerError('');
    setRootPickerMode('single');
    setRootEditEntryNodeId(null);
    setSelectedRootCalls([]);
    setRootPickerActor('our');
    setSequenceRootSteps([]);
    setSequenceNextActor('our');
  };

  const toggleRootCallSelection = (call: string) => {
    const callKey = `${rootPickerActor}:${call}`;
    if (existingRootCallByActor.has(callKey)) return;
    setSelectedRootCalls((prev) => (
      prev.includes(call) ? prev.filter((item) => item !== call) : [...prev, call]
    ));
    if (rootPickerError) setRootPickerError('');
  };

  const submitSingleRootPicker = () => {
    const callsToAdd = selectedRootCalls.filter((call) => (
      !existingRootCallByActor.has(`${rootPickerActor}:${call}`)
    ));
    if (callsToAdd.length === 0) {
      setRootPickerError('Select at least one available root call.');
      return;
    }

    callsToAdd.forEach((call) => {
      addNode(null, call, rootPickerActor);
    });
    closeRootPicker();
  };

  const appendSequenceStep = (call: string) => {
    const normalizedCall = normalizeBiddingCall(call);
    if (!normalizedCall) return;
    if (!isSequenceCallAvailable(sequenceRootSteps, normalizedCall)) return;
    setSequenceRootSteps((prev) => [
      ...prev,
      { call: normalizedCall, actor: sequenceNextActor },
    ]);
    if (rootPickerError) setRootPickerError('');
  };

  const popSequenceStep = () => {
    setSequenceRootSteps((prev) => prev.slice(0, -1));
  };

  const clearSequenceSteps = () => {
    setSequenceRootSteps([]);
  };

  const submitSequenceRootPicker = () => {
    if (sequenceRootSteps.length === 0) {
      setRootPickerError('Build a sequence first.');
      return;
    }

    let parentNodeId: string | null = null;
    for (let index = 0; index < sequenceRootSteps.length; index += 1) {
      const step = sequenceRootSteps[index];
      const currentNodeId = buildSequenceIdFromSteps(sequenceRootSteps.slice(0, index + 1));
      if (!useBiddingStore.getState().nodes[currentNodeId]) {
        addNode(parentNodeId, step.call, step.actor);
      }
      parentNodeId = currentNodeId;
    }

    const finalNodeId = buildSequenceIdFromSteps(sequenceRootSteps);
    if (!useBiddingStore.getState().nodes[finalNodeId]) {
      setRootPickerError('Failed to build sequence path.');
      return;
    }

    if (rootEditEntryNodeId) {
      if (finalNodeId === rootEditEntryNodeId) {
        closeRootPicker();
        return;
      }
      if (roots.some((root) => root.id === finalNodeId && root.id !== rootEditEntryNodeId)) {
        setRootPickerError('This sequence is already in roots.');
        return;
      }

      const removeResult = removeRootEntry(rootEditEntryNodeId);
      if (!removeResult.ok) {
        setRootPickerError(removeResult.error || 'Failed to update root entry.');
        return;
      }
      const addResult = addRootEntry(finalNodeId);
      if (!addResult.ok) {
        addRootEntry(rootEditEntryNodeId);
        setRootPickerError(addResult.error || 'Failed to update root entry.');
        return;
      }

      setLeftPrimaryMode('roots');
      setActiveSectionId(null);
      setActiveSmartViewId(null);
      setActiveRootEntryNodeId(finalNodeId);
      selectNode(finalNodeId);
      closeRootPicker();
      return;
    }

    const result = addRootEntry(finalNodeId);
    if (!result.ok) {
      setRootPickerError(result.error || 'Failed to add sequence root.');
      return;
    }
    setLeftPrimaryMode('roots');
    setActiveSectionId(null);
    setActiveSmartViewId(null);
    setActiveRootEntryNodeId(finalNodeId);
    selectNode(finalNodeId);
    closeRootPicker();
  };

  const addSelectedNodeAsRoot = () => {
    if (!selectedNodeId || !nodes[selectedNodeId]) return;
    const result = addRootEntry(selectedNodeId);
    if (!result.ok) {
      setRootPickerError(result.error || 'Failed to add selected sequence.');
      return;
    }
    setLeftPrimaryMode('roots');
    setActiveSectionId(null);
    setActiveSmartViewId(null);
    setActiveRootEntryNodeId(selectedNodeId);
    closeRootPicker();
  };

  const openEditRootEntry = (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return;
    setRootPickerError('');
    setRootEditEntryNodeId(nodeId);
    setRootPickerMode('sequence');
    setSelectedRootCalls([]);
    setRootPickerActor('our');
    setSequenceRootSteps(node.context.sequence.map((step) => ({ ...step })));
    setSequenceNextActor('our');
    setIsRootPickerOpen(true);
  };

  const openRootDeleteDialog = (nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return;
    const label = node.context.sequence
      .map((step) => (step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)))
      .join(' - ');
    setRootDeleteDialog({
      nodeId,
      label,
    });
  };

  const closeRootDeleteDialog = () => {
    setRootDeleteDialog(null);
  };

  const confirmRootDelete = () => {
    if (!rootDeleteDialog) return;
    removeRootEntry(rootDeleteDialog.nodeId);
    closeRootDeleteDialog();
  };

  useEffect(() => {
    if (!actionMenuSectionId && !actionMenuSmartViewId) return;

    const handleGlobalMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-leftpanel-menu]')) return;
      if (target.closest('[data-leftpanel-menu-trigger]')) return;
      setActionMenuSectionId(null);
      setActionMenuSmartViewId(null);
    };

    window.addEventListener('mousedown', handleGlobalMouseDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown);
    };
  }, [actionMenuSectionId, actionMenuSmartViewId]);

  const openCreateModal = (parentId: string | null) => {
    setSectionModal({
      mode: 'create',
      parentId,
      title: parentId ? 'Create Subsection' : 'Create Section',
      confirmText: 'Create',
      initialValue: '',
    });
    setSectionModalInput('');
    setSectionModalError('');
    setActionMenuSectionId(null);
  };

  const openRenameModal = (sectionId: string, currentName: string) => {
    setSectionModal({
      mode: 'rename',
      sectionId,
      title: 'Rename Section',
      confirmText: 'Save',
      initialValue: currentName,
    });
    setSectionModalInput(currentName);
    setSectionModalError('');
    setActionMenuSectionId(null);
  };

  const openDeleteModal = (sectionId: string) => {
    setSectionModal({
      mode: 'delete',
      sectionId,
      title: 'Delete Section',
      confirmText: 'Delete',
      initialValue: '',
    });
    setSectionModalInput('');
    setSectionModalError('');
    setActionMenuSectionId(null);
  };

  const closeModal = () => {
    setSectionModal(null);
    setSectionModalInput('');
    setSectionModalError('');
  };

  const submitSectionModal = () => {
    if (!sectionModal) return;

    let result: SectionMutationResult = { ok: false, error: 'Unknown action.' };
    if (sectionModal.mode === 'create') {
      result = createSection(sectionModalInput, sectionModal.parentId);
    } else if (sectionModal.mode === 'rename') {
      result = renameSection(sectionModal.sectionId, sectionModalInput);
    } else if (sectionModal.mode === 'delete') {
      result = deleteSection(sectionModal.sectionId);
    }

    if (result.ok) {
      closeModal();
      return;
    }
    setSectionModalError(toErrorMessage(result));
  };

  const reorderSectionFromMenu = (sectionId: string, targetIndex: number) => {
    const result = reorderSection(sectionId, targetIndex);
    if (!result.ok) {
      setSectionDragError(result.error || 'Failed to reorder section.');
      return;
    }
    setSectionDragError('');
    setActionMenuSectionId(null);
  };

  const resolveSectionDropDestination = (
    sourceSectionId: string,
    targetSectionId: string,
    placement: SectionDropPlacement,
  ): { targetParentId: string | null; targetIndex: number } | null => {
    const source = sectionsById[sourceSectionId];
    const target = sectionsById[targetSectionId];
    if (!source || !target) return null;

    if (placement === 'inside') {
      const childCount = getSectionChildren(targetSectionId).length;
      return {
        targetParentId: targetSectionId,
        targetIndex: childCount,
      };
    }

    const targetParentId = target.parentId;
    const siblings = getSectionChildren(targetParentId).filter((section) => !(
      source.parentId === targetParentId && section.id === sourceSectionId
    ));
    const targetIndexInSiblings = siblings.findIndex((section) => section.id === targetSectionId);
    if (targetIndexInSiblings === -1) return null;

    return {
      targetParentId,
      targetIndex: placement === 'before' ? targetIndexInSiblings : targetIndexInSiblings + 1,
    };
  };

  const handleSectionDragStart = (event: DragEvent<HTMLButtonElement>, sectionId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sectionId);
    setDraggingSectionId(sectionId);
    setSectionDropHint(null);
    setSectionDragError('');
    setActionMenuSectionId(null);
  };

  const handleSectionDragOver = (event: DragEvent<HTMLButtonElement>, sectionId: string) => {
    const sourceSectionId = draggingSectionId;
    if (!sourceSectionId) return;
    event.preventDefault();

    if (sourceSectionId === sectionId) {
      setSectionDropHint(null);
      return;
    }

    const placement = getSectionDropPlacement(event);
    setSectionDropHint((prev) => (
      prev?.targetSectionId === sectionId && prev.placement === placement
        ? prev
        : { targetSectionId: sectionId, placement }
    ));
  };

  const handleSectionDragLeave = (event: DragEvent<HTMLButtonElement>, sectionId: string) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    setSectionDropHint((prev) => (prev?.targetSectionId === sectionId ? null : prev));
  };

  const handleSectionDrop = (event: DragEvent<HTMLButtonElement>, targetSectionId: string) => {
    event.preventDefault();
    const sourceSectionId = draggingSectionId || event.dataTransfer.getData('text/plain');
    if (!sourceSectionId || sourceSectionId === targetSectionId) {
      setSectionDropHint(null);
      setDraggingSectionId(null);
      return;
    }

    const placement = sectionDropHint?.targetSectionId === targetSectionId
      ? sectionDropHint.placement
      : getSectionDropPlacement(event);
    const destination = resolveSectionDropDestination(sourceSectionId, targetSectionId, placement);
    if (!destination) {
      setSectionDropHint(null);
      setDraggingSectionId(null);
      setSectionDragError('Cannot resolve section move target.');
      return;
    }

    const result = moveSection(sourceSectionId, destination.targetParentId, destination.targetIndex);
    if (!result.ok) {
      setSectionDragError(result.error || 'Failed to move section.');
    } else {
      setSectionDragError('');
    }
    setSectionDropHint(null);
    setDraggingSectionId(null);
  };

  const handleSectionDragEnd = () => {
    setDraggingSectionId(null);
    setSectionDropHint(null);
  };

  const openCreateSmartViewModal = () => {
    setSmartViewModal({
      mode: 'create',
      title: 'Create Smart View',
      confirmText: 'Create',
    });
    setSmartViewNameInput('');
    setSmartViewQueryInput('');
    setSmartViewFieldInput('all');
    setSmartViewModalError('');
    setActionMenuSmartViewId(null);
  };

  const openEditSmartViewModal = (smartViewId: string) => {
    const smartView = customSmartViewsById[smartViewId];
    if (!smartView) return;
    setSmartViewModal({
      mode: 'edit',
      smartViewId,
      title: 'Edit Smart View',
      confirmText: 'Save',
    });
    setSmartViewNameInput(smartView.name);
    setSmartViewQueryInput(smartView.query);
    setSmartViewFieldInput(smartView.field);
    setSmartViewModalError('');
    setActionMenuSmartViewId(null);
  };

  const openDeleteSmartViewModal = (smartViewId: string) => {
    setSmartViewModal({
      mode: 'delete',
      smartViewId,
      title: 'Delete Smart View',
      confirmText: 'Delete',
    });
    setSmartViewNameInput('');
    setSmartViewQueryInput('');
    setSmartViewFieldInput('all');
    setSmartViewModalError('');
    setActionMenuSmartViewId(null);
  };

  const closeSmartViewModal = () => {
    setSmartViewModal(null);
    setSmartViewNameInput('');
    setSmartViewQueryInput('');
    setSmartViewFieldInput('all');
    setSmartViewModalError('');
  };

  const submitSmartViewModal = () => {
    if (!smartViewModal) return;
    let result: SmartViewMutationResult = { ok: false, error: 'Unknown action.' };
    if (smartViewModal.mode === 'create') {
      result = createCustomSmartView(smartViewNameInput, smartViewQueryInput, smartViewFieldInput);
    } else if (smartViewModal.mode === 'edit') {
      result = updateCustomSmartView(smartViewModal.smartViewId, {
        name: smartViewNameInput,
        query: smartViewQueryInput,
        field: smartViewFieldInput,
      });
    } else if (smartViewModal.mode === 'delete') {
      result = deleteCustomSmartView(smartViewModal.smartViewId);
    }

    if (result.ok) {
      closeSmartViewModal();
      return;
    }
    setSmartViewModalError(toSmartViewErrorMessage(result));
  };

  const renderSectionRows = (items: SectionTreeNode[], depth = 0, indexPath: number[] = []): ReactNode => {
    return items.map((item, index) => {
      const section = item.section;
      const children = item.children;
      const hasChildren = children.length > 0;
      const isExpanded = sectionExpandedById[section.id] ?? true;
      const isActive = leftPrimaryMode === 'sections' && activeSectionId === section.id;
      const nodeCount = getSectionNodeCount(section.id);
      const sectionIndexPath = [...indexPath, index + 1];
      const sectionIndexLabel = `${sectionIndexPath.join('.')}.`;
      const sectionFontSizePx = Math.max(13 - depth, 11);
      const canMoveUp = index > 0;
      const canMoveDown = index < items.length - 1;
      const isDragging = draggingSectionId === section.id;
      const activeDropPlacement = sectionDropHint?.targetSectionId === section.id
        ? sectionDropHint.placement
        : null;

      return (
        <li key={section.id} className="relative">
          {activeDropPlacement === 'before' && (
            <div className="pointer-events-none absolute left-2 right-2 -top-0.5 h-0.5 rounded-full bg-blue-500" />
          )}
          <div className="group flex items-center gap-1">
            <button
              type="button"
              draggable
              onDragStart={(event) => handleSectionDragStart(event, section.id)}
              onDragOver={(event) => handleSectionDragOver(event, section.id)}
              onDragLeave={(event) => handleSectionDragLeave(event, section.id)}
              onDrop={(event) => handleSectionDrop(event, section.id)}
              onDragEnd={handleSectionDragEnd}
              onClick={() => {
                setLeftPrimaryMode('sections');
                setActiveSectionId(section.id);
                setActiveSmartViewId(null);
              }}
              className={`flex-1 min-w-0 text-left rounded-md transition-colors cursor-grab active:cursor-grabbing ${
                activeDropPlacement === 'inside'
                  ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-300'
                  : isActive
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-slate-200 text-slate-700'
              } ${
                isDragging ? 'opacity-60' : ''
              }`}
              style={{
                padding: `6px 8px 6px ${8 + depth * 14}px`,
                fontSize: `${sectionFontSizePx}px`,
                lineHeight: `${Math.max(18 - depth, 16)}px`,
              }}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                {hasChildren ? (
                  <span
                    className="shrink-0 p-0.5 rounded hover:bg-slate-300"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleSectionExpanded(section.id);
                    }}
                    role="button"
                    aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </span>
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <span className="shrink-0 text-slate-400 tabular-nums">{sectionIndexLabel}</span>
                <span className="truncate">{section.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-slate-500 bg-slate-200 rounded-full px-1.5 py-0.5">
                  {nodeCount}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActionMenuSectionId((prev) => (prev === section.id ? null : section.id))
              }
              data-leftpanel-menu-trigger
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Section actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeDropPlacement === 'after' && (
            <div className="pointer-events-none absolute left-2 right-2 -bottom-0.5 h-0.5 rounded-full bg-blue-500" />
          )}

          {actionMenuSectionId === section.id && (
            <div data-leftpanel-menu className="absolute right-1 top-8 z-30 w-44 rounded-md border border-slate-200 bg-white shadow-lg py-1">
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={() => reorderSectionFromMenu(section.id, index - 1)}
                className={`w-full px-3 py-1.5 text-left text-xs inline-flex items-center gap-2 ${
                  canMoveUp
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-3 h-3" />
                Move up
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={() => reorderSectionFromMenu(section.id, index + 1)}
                className={`w-full px-3 py-1.5 text-left text-xs inline-flex items-center gap-2 ${
                  canMoveDown
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <ArrowDown className="w-3 h-3" />
                Move down
              </button>
              <button
                type="button"
                onClick={() => openRenameModal(section.id, section.name)}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 inline-flex items-center gap-2"
              >
                <Pencil className="w-3 h-3" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => openCreateModal(section.id)}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 inline-flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                New subsection
              </button>
              <button
                type="button"
                onClick={() => openDeleteModal(section.id)}
                className="w-full px-3 py-1.5 text-left text-xs text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}

          {hasChildren && isExpanded && (
            <ul className="space-y-1 mt-0.5">{renderSectionRows(children, depth + 1, sectionIndexPath)}</ul>
          )}
        </li>
      );
    });
  };

  const renderSmartViewRows = (): ReactNode => {
    return smartViews.map((smartView) => {
      const isActive = leftPrimaryMode === 'smartViews' && activeSmartViewId === smartView.id;
      const count = getSmartViewCount(smartView.id);

      return (
        <li key={smartView.id} className="relative">
          <div className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setLeftPrimaryMode('smartViews');
                setActiveSmartViewId(smartView.id);
                setActiveSectionId(null);
              }}
              className={`flex-1 min-w-0 text-left rounded-md text-sm transition-colors px-2 py-1.5 ${
                isActive ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0 w-full">
                <span className="truncate">{smartView.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-slate-500 bg-slate-200 rounded-full px-1.5 py-0.5">
                  {count}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                toggleSmartViewPinned(smartView.id);
              }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 ${
                smartView.isPinned ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-label={smartView.isPinned ? 'Unpin smart view' : 'Pin smart view'}
              title={smartView.isPinned ? 'Unpin' : 'Pin'}
            >
              {smartView.isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>

            {!smartView.isBuiltIn && (
              <button
                type="button"
                onClick={() => setActionMenuSmartViewId((prev) => (prev === smartView.id ? null : smartView.id))}
                data-leftpanel-menu-trigger
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                aria-label="Smart view actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {actionMenuSmartViewId === smartView.id && !smartView.isBuiltIn && (
            <div data-leftpanel-menu className="absolute right-1 top-8 z-30 w-44 rounded-md border border-slate-200 bg-white shadow-lg py-1">
              <button
                type="button"
                onClick={() => openEditSmartViewModal(smartView.id)}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 inline-flex items-center gap-2"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => openDeleteSmartViewModal(smartView.id)}
                className="w-full px-3 py-1.5 text-left text-xs text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </li>
      );
    });
  };

  return (
    <div className="h-full w-full border-r border-[#DBEAFE] bg-slate-50 flex flex-col overflow-y-auto relative">
      <div className="p-4">
        <div className="flex items-center mb-3">
          <button
            type="button"
            onClick={() => setIsRootsOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
          >
            <FolderTree className="w-3.5 h-3.5" />
            Roots
          </button>
          <button
            type="button"
            onClick={openRootPicker}
            className="ml-1 p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Add root calls"
            aria-label="Add root calls"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="ml-2 inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setRootViewMode('matrix')}
              className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                rootViewMode === 'matrix'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Matrix view"
            >
              Matrix
            </button>
            <button
              type="button"
              onClick={() => setRootViewMode('list')}
              className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                rootViewMode === 'list'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="List view"
            >
              List
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsRootsOpen((prev) => !prev)}
            className="ml-auto p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title={isRootsOpen ? 'Collapse roots' : 'Expand roots'}
          >
            {isRootsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
        {isRootsOpen && (
          <>
            {rootViewMode === 'matrix' ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setIsOurRootsOpen((prev) => !prev)}
                  className="w-full inline-flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-700"
                >
                  <span>Our roots</span>
                  {isOurRootsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {isOurRootsOpen && ROOT_DISPLAY_LEVELS.map((level) => (
                  <div key={`roots-row-${level}`} className="grid grid-cols-5 gap-1">
                    {ROOT_DISPLAY_SUITS.map((suit) => {
                      const call = `${level}${suit}`;
                      const root = rootsByCall.get(call);
                      const isActive = leftPrimaryMode === 'roots' && selectedRootCall === call;

                      if (!root) {
                        return (
                          <div
                            key={`root-empty-${call}`}
                            className="h-7 rounded-md border border-slate-200 bg-slate-100/70 text-[11px] text-slate-300 flex items-center justify-center select-none"
                            title={`${formatCall(call)} is not added to roots`}
                          >
                            {formatCall(call)}
                          </div>
                        );
                      }

                      return (
                        <div key={root.id} className="relative group/root">
                          <button
                            type="button"
                            onClick={() => {
                              setLeftPrimaryMode('roots');
                              setActiveSectionId(null);
                              setActiveSmartViewId(null);
                              setActiveRootEntryNodeId(root.id);
                              selectNode(root.id);
                            }}
                            className={`h-7 w-full px-1 rounded-md border text-[12px] font-semibold transition-colors ${
                              isActive
                                ? 'border-blue-200 bg-blue-100 text-blue-900'
                                : `border-slate-200 bg-white hover:border-slate-300 ${getSuitColor(call)}`
                            }`}
                          >
                            {formatCall(call)}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openRootDeleteDialog(root.id);
                            }}
                            className="absolute -top-1 -right-1 opacity-0 group-hover/root:opacity-100 transition-opacity p-0.5 rounded bg-white border border-slate-200 text-slate-400 hover:text-rose-700 hover:border-rose-200"
                            title="Delete root"
                            aria-label={`Delete root ${formatCall(call)}`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="pt-1.5 border-t border-[#BFDBFE] space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsSequenceOppRootsOpen((prev) => !prev)}
                    className="w-full inline-flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-700"
                  >
                    <span>Sequence / Opp roots</span>
                    {isSequenceOppRootsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {isSequenceOppRootsOpen && (
                    extraRoots.length > 0 ? (
                      <ul className="space-y-1">
                        {extraRoots.map((root) => {
                          const label = root.context.sequence
                            .map((step) => (
                              step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)
                            ))
                            .join(' - ');
                          const isActive = leftPrimaryMode === 'roots' && activeRootEntryNodeId === root.id;
                          return (
                            <li key={`extra-root-${root.id}`} className="group flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setLeftPrimaryMode('roots');
                                  setActiveSectionId(null);
                                  setActiveSmartViewId(null);
                                  setActiveRootEntryNodeId(root.id);
                                  selectNode(root.id);
                                }}
                                className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors truncate ${
                                  isActive ? 'bg-blue-100 text-blue-900' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                                title={label}
                              >
                                {label}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditRootEntry(root.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                title="Edit root"
                                aria-label={`Edit root ${label}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openRootDeleteDialog(root.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:bg-rose-100 hover:text-rose-700"
                                title="Delete root"
                                aria-label={`Delete root ${label}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic px-1">No sequence/opp roots</div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsOurRootsOpen((prev) => !prev)}
                    className="w-full inline-flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-700"
                  >
                    <span>Our roots</span>
                    {isOurRootsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {isOurRootsOpen && (
                    <ul className="space-y-1">
                      {ourRoots.map((root) => {
                        const rootStep = root.context.sequence[0];
                        const call = rootStep.call;
                        const isActive = leftPrimaryMode === 'roots' && activeRootEntryNodeId === root.id;
                        const callLabel = formatCall(call);
                        return (
                          <li key={root.id} className="group flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setLeftPrimaryMode('roots');
                                setActiveSectionId(null);
                                setActiveSmartViewId(null);
                                setActiveRootEntryNodeId(root.id);
                                selectNode(root.id);
                              }}
                              className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                isActive ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <span className={getSuitColor(call)}>{callLabel}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openRootDeleteDialog(root.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:bg-rose-100 hover:text-rose-700"
                              title="Delete root"
                              aria-label={`Delete root ${callLabel}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="space-y-1 pt-1 border-t border-[#BFDBFE]">
                  <button
                    type="button"
                    onClick={() => setIsSequenceOppRootsOpen((prev) => !prev)}
                    className="w-full inline-flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-700"
                  >
                    <span>Sequence / Opp roots</span>
                    {isSequenceOppRootsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {isSequenceOppRootsOpen && (
                    extraRoots.length > 0 ? (
                      <ul className="space-y-1">
                        {extraRoots.map((root) => {
                          const rootStep = root.context.sequence[0];
                          const call = rootStep.call;
                          const isActive = leftPrimaryMode === 'roots' && activeRootEntryNodeId === root.id;
                          const canEditRoot = root.context.sequence.length > 1 || rootStep.actor === 'opp';
                          const callLabel = root.context.sequence
                            .map((step) => (
                              step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)
                            ))
                            .join(' - ');
                          return (
                            <li key={root.id} className="group flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setLeftPrimaryMode('roots');
                                  setActiveSectionId(null);
                                  setActiveSmartViewId(null);
                                  setActiveRootEntryNodeId(root.id);
                                  selectNode(root.id);
                                }}
                                className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  isActive ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                <span className={root.context.sequence.length === 1 && rootStep.actor !== 'opp' ? getSuitColor(call) : 'text-slate-700'}>
                                  {callLabel}
                                </span>
                              </button>
                              {canEditRoot && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditRootEntry(root.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                  title="Edit root"
                                  aria-label={`Edit root ${callLabel}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openRootDeleteDialog(root.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:bg-rose-100 hover:text-rose-700"
                                title="Delete root"
                                aria-label={`Delete root ${callLabel}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic px-1">No sequence/opp roots</div>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t-2 border-[#BFDBFE]">
        <div className="flex items-center mb-3">
          <button
            type="button"
            onClick={() => setIsSectionsOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
          >
            <span className="inline-flex items-center gap-2">
              <FolderPlus className="w-3.5 h-3.5" />
              Sections
            </span>
          </button>
          <button
            type="button"
            onClick={() => openCreateModal(null)}
            className="p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Create section"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsSectionsOpen((prev) => !prev)}
            className="ml-auto p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title={isSectionsOpen ? 'Collapse sections' : 'Expand sections'}
          >
            {isSectionsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isSectionsOpen && (
          <>
            <div className="mb-2 text-[10px] text-slate-400">
              Drag sections to reorder or move into another section.
            </div>
            {sectionDragError && (
              <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                {sectionDragError}
              </div>
            )}
            {sectionTree.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-3">
                <div className="text-xs text-slate-500">No sections yet</div>
                <button
                  type="button"
                  onClick={() => openCreateModal(null)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create first section
                </button>
              </div>
            ) : (
              <ul className="space-y-1">{renderSectionRows(sectionTree, 0)}</ul>
            )}
          </>
        )}
      </div>

      <div className="px-4 py-2 border-t-2 border-[#BFDBFE]">
        <button
          type="button"
          onClick={() => setIsBookmarksOpen((prev) => !prev)}
          className="w-full mb-3 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
        >
          <span className="inline-flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5" />
            Bookmarks
          </span>
          {isBookmarksOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {isBookmarksOpen && (
          <>
            {bookmarks.length === 0 ? (
              <div className="text-xs text-slate-400 italic px-2">No bookmarks</div>
            ) : (
              <ul className="space-y-1">
                {bookmarks.map((bm) => (
                  <li key={bm.id}>
                    <button
                      onClick={() => {
                        setLeftPrimaryMode('roots');
                        setActiveSectionId(null);
                        setActiveSmartViewId(null);
                        setActiveRootEntryNodeId(null);
                        selectNode(bm.id);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-sm font-medium transition-colors truncate ${
                        selectedNodeId === bm.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {bm.context.sequence.map((step, i) => (
                        <span key={i} className="inline-flex items-center">
                          <span className={step.actor === 'opp' ? 'text-slate-500' : getSuitColor(step.call)}>
                            {step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)}
                          </span>
                          {i < bm.context.sequence.length - 1 && (
                            <span className="mx-1 text-slate-400">-</span>
                          )}
                        </span>
                      ))}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="px-4 py-4 border-t-2 border-[#BFDBFE] mt-auto">
        <div className="flex items-center mb-3">
          <button
            type="button"
            onClick={() => setIsSmartViewsOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Views
            </span>
          </button>
          <button
            type="button"
            onClick={openCreateSmartViewModal}
            className="p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Create custom smart view"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsSmartViewsOpen((prev) => !prev)}
            className="ml-auto p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title={isSmartViewsOpen ? 'Collapse smart views' : 'Expand smart views'}
          >
            {isSmartViewsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
        {isSmartViewsOpen && (
          <ul className="space-y-1">
            {renderSmartViewRows()}
          </ul>
        )}
      </div>

      {isRootPickerOpen && (
        <div
          className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center p-3"
          onClick={closeRootPicker}
        >
          <div
            className="w-full max-w-[292px] rounded-xl border border-slate-200 bg-white shadow-xl p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {rootEditEntryNodeId ? 'Edit root entry' : 'Add root entry'}
            </div>
            <div className="mt-1 text-[11px] text-slate-600">
              {rootEditEntryNodeId
                ? 'Update sequence and save changes.'
                : 'Choose calls for a new root or pin current sequence as an additional root entry.'}
            </div>
            {rootEditEntryNodeId && (
              <div className="mt-1 text-[10px] text-slate-500">
                Editing: {editingRootLabel}
              </div>
            )}

            <div className="mt-2 inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (rootEditEntryNodeId) return;
                  setRootPickerMode('single');
                  setRootPickerError('');
                }}
                disabled={!!rootEditEntryNodeId}
                className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                  rootPickerMode === 'single'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                } ${rootEditEntryNodeId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Single bids
              </button>
              <button
                type="button"
                onClick={() => {
                  setRootPickerMode('sequence');
                  setRootPickerError('');
                }}
                className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                  rootPickerMode === 'sequence'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sequence
              </button>
            </div>

            {rootPickerMode === 'single' ? (
              <>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={addSelectedNodeAsRoot}
                    disabled={!canAddSelectedNodeAsRoot}
                    className={`w-full h-8 px-2 rounded-md border text-left text-[11px] transition-colors ${
                      canAddSelectedNodeAsRoot
                        ? 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title={canAddSelectedNodeAsRoot ? 'Add selected sequence as root entry' : 'Select a sequence not already in roots'}
                  >
                    {canAddSelectedNodeAsRoot
                      ? `Use selected: ${selectedNodeLabel}`
                      : 'Select a sequence first'}
                  </button>
                </div>

                <div className="mt-2 inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRootPickerActor('our');
                      setSelectedRootCalls([]);
                    }}
                    className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                      rootPickerActor === 'our'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Our roots
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRootPickerActor('opp');
                      setSelectedRootCalls([]);
                    }}
                    className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                      rootPickerActor === 'opp'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Opp roots
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-5 gap-1">
                  {ROOT_BID_CALLS.map((call) => {
                    const isDisabled = existingRootCallByActor.has(`${rootPickerActor}:${call}`);
                    const isSelected = selectedRootCalls.includes(call);
                    return (
                      <button
                        key={`root-picker-${call}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggleRootCallSelection(call)}
                        className={`h-7 px-1 rounded-md text-[11px] border transition-colors ${
                          isSelected
                            ? 'border-blue-300 bg-blue-100 text-blue-700'
                            : isDisabled
                              ? 'border-slate-200 bg-slate-100 text-slate-300 opacity-60 cursor-not-allowed'
                              : `border-slate-200 bg-white hover:border-slate-300 ${
                                rootPickerActor === 'opp' ? 'text-slate-500' : getSuitColor(call)
                              }`
                        }`}
                        title={isDisabled ? `${formatCall(call)} already exists in roots` : `Add ${formatCall(call)}`}
                      >
                        {rootPickerActor === 'opp' ? `(${formatCall(call)})` : formatCall(call)}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 text-[10px] text-slate-500">
                  Selected: {selectedRootCalls.length}
                </div>
              </>
            ) : (
              <>
                <div className="mt-2 inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSequenceNextActor('our')}
                    className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                      sequenceNextActor === 'our'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Next: Our
                  </button>
                  <button
                    type="button"
                    onClick={() => setSequenceNextActor('opp')}
                    className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                      sequenceNextActor === 'opp'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Next: Opp
                  </button>
                </div>

                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 min-h-[34px] text-[11px] text-slate-700">
                  {sequenceRootSteps.length > 0 ? sequencePreviewLabel : 'Start sequence'}
                </div>

                <div className="mt-1 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={popSequenceStep}
                    className="h-6 px-2 rounded-md border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    disabled={sequenceRootSteps.length === 0}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={clearSequenceSteps}
                    className="h-6 px-2 rounded-md border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    disabled={sequenceRootSteps.length === 0}
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-5 gap-1">
                  {ROOT_BID_CALLS.map((call) => {
                    const isAvailable = isSequenceCallAvailable(sequenceRootSteps, call);
                    return (
                      <button
                        key={`sequence-root-picker-${call}`}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => appendSequenceStep(call)}
                        className={`h-7 px-1 rounded-md text-[11px] border transition-colors ${
                          isAvailable
                            ? `border-slate-200 bg-white hover:border-slate-300 ${
                              sequenceNextActor === 'opp' ? 'text-slate-500' : getSuitColor(call)
                            }`
                            : 'border-slate-200 bg-slate-100 text-slate-300 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {sequenceNextActor === 'opp' ? `(${formatCall(call)})` : formatCall(call)}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {ROOT_SPECIAL_CALLS.map((call) => {
                    const isAvailable = isSequenceCallAvailable(sequenceRootSteps, call);
                    return (
                      <button
                        key={`sequence-root-picker-special-${call}`}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => appendSequenceStep(call)}
                        className={`h-7 px-2 rounded-md text-[11px] border transition-colors ${
                          isAvailable
                            ? `border-slate-200 bg-white hover:border-slate-300 ${
                              sequenceNextActor === 'opp' ? 'text-slate-500' : 'text-slate-700'
                            }`
                            : 'border-slate-200 bg-slate-100 text-slate-300 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {sequenceNextActor === 'opp' ? `(${formatCall(call)})` : formatCall(call)}
                      </button>
                    );
                  })}
                </div>

                {sequenceConflictsExistingRoot && (
                  <div className="mt-1.5 text-[10px] text-slate-500">
                    This sequence is already in roots.
                  </div>
                )}
              </>
            )}

            {rootPickerError && (
              <div className="mt-1.5 text-[11px] text-rose-600">{rootPickerError}</div>
            )}

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRootPicker}
                className="h-8 px-3 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={rootPickerMode === 'single' ? submitSingleRootPicker : submitSequenceRootPicker}
                className="h-8 px-3 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={rootPickerMode === 'single' ? !canSubmitSingleMode : !canSubmitSequenceMode}
              >
                {rootEditEntryNodeId ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rootDeleteDialog && (
        <div
          className="absolute inset-0 z-[55] bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center p-3"
          onClick={closeRootDeleteDialog}
        >
          <div
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">
                {removeRootIntentMeta.title}
              </div>
              <div className="mt-0.5 text-xs">
                <span className="text-slate-700">{rootDeleteDialog.label}</span>
              </div>
            </div>

            <div className="px-4 py-3 text-sm text-slate-600">
              This will only remove this sequence from the Roots list. The original sequence tree will remain unchanged.
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRootDeleteDialog}
                className="h-8 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRootDelete}
                className={`h-8 px-3 text-sm font-semibold text-white rounded-md transition-colors ${removeRootIntentMeta.confirmButtonClassName}`}
              >
                {removeRootIntentMeta.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {sectionModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-lg border border-slate-200 bg-white shadow-xl p-4">
            <h4 className="text-sm font-semibold text-slate-800">{sectionModal.title}</h4>
            {sectionModal.mode === 'delete' ? (
              <p className="mt-2 text-xs text-slate-600">
                Delete this section? Child sections will be moved to the parent level.
              </p>
            ) : (
              <div className="mt-3">
                <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  Section name
                </label>
                <input
                  value={sectionModalInput}
                  onChange={(event) => setSectionModalInput(event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Openings"
                  autoFocus
                />
              </div>
            )}

            {sectionModalError && (
              <div className="mt-2 text-xs text-rose-600">{sectionModalError}</div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="h-8 px-3 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSectionModal}
                className={`h-8 px-3 rounded-md text-sm text-white ${
                  sectionModal.mode === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {sectionModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {smartViewModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl p-4">
            <h4 className="text-sm font-semibold text-slate-800">{smartViewModal.title}</h4>
            {smartViewModal.mode === 'delete' ? (
              <p className="mt-2 text-xs text-slate-600">
                Delete this custom smart view?
              </p>
            ) : (
              <>
                <div className="mt-3">
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                    Name
                  </label>
                  <input
                    value={smartViewNameInput}
                    onChange={(event) => setSmartViewNameInput(event.target.value)}
                    className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Transfer candidates"
                    autoFocus
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                    Query
                  </label>
                  <input
                    value={smartViewQueryInput}
                    onChange={(event) => setSmartViewQueryInput(event.target.value)}
                    className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="text match"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                    Field
                  </label>
                  <select
                    value={smartViewFieldInput}
                    onChange={(event) => setSmartViewFieldInput(event.target.value as CustomSmartViewField)}
                    className="h-8 w-full rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="sequence">Sequence</option>
                    <option value="notes">Notes</option>
                    <option value="shows">Shows</option>
                  </select>
                </div>
              </>
            )}

            {smartViewModalError && (
              <div className="mt-2 text-xs text-rose-600">{smartViewModalError}</div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeSmartViewModal}
                className="h-8 px-3 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSmartViewModal}
                className={`h-8 px-3 rounded-md text-sm text-white ${
                  smartViewModal.mode === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {smartViewModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
