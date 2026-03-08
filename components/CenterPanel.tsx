import { useBiddingStore, BiddingNode } from '@/store/useBiddingStore';
import { compareSequences, formatCall, getSuitColor } from '@/lib/utils';
import { useState } from 'react';
import { SequenceRow } from './SequenceRow';
import { ChevronsUpDown, ChevronsDownUp, Undo2, Redo2 } from 'lucide-react';
import { buildSequenceIdFromSteps } from '@/lib/bidding-steps';

type TreeViewMode = 'classic' | 'compact';

export function CenterPanel() {
  const {
    nodes,
    sectionsById,
    selectedNodeId,
    activeRootEntryNodeId,
    searchQuery,
    leftPrimaryMode,
    activeSectionId,
    activeSmartViewId,
    canUndo,
    canRedo,
    undo,
    redo,
    expandAll,
    collapseAll,
    selectNode,
    getSmartViews,
    getPrimaryMatchedNodeIds,
    getEffectiveSectionIds,
    setLeftPrimaryMode,
    setActiveRootEntryNodeId,
    setActiveSectionId,
    setActiveSmartViewId,
  } = useBiddingStore();
  const allNodeIds = Object.keys(nodes);
  const [viewMode, setViewMode] = useState<TreeViewMode>('classic');

  const activeRootNode = activeRootEntryNodeId ? nodes[activeRootEntryNodeId] ?? null : null;
  const effectiveRootEntryNodeId = activeRootNode ? activeRootNode.id : null;
  const rootSequenceLength = activeRootNode?.context.sequence.length ?? 0;

  const isSectionFilterMode = leftPrimaryMode === 'sections';
  const isSmartFilterMode = leftPrimaryMode === 'smartViews' && !!activeSmartViewId;
  const isRootFilterMode = leftPrimaryMode === 'roots' && !!effectiveRootEntryNodeId;

  const activeSection = leftPrimaryMode === 'sections' && activeSectionId
    ? sectionsById[activeSectionId] ?? null
    : null;
  const activeSmartView = leftPrimaryMode === 'smartViews' && activeSmartViewId
    ? getSmartViews().find((smartView) => smartView.id === activeSmartViewId) ?? null
    : null;
  const activeRootLabel = activeRootNode
    ? activeRootNode.context.sequence.map((step) => (
      step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)
    )).join(' - ')
    : null;

  const isPrimaryFilterActive = isSectionFilterMode || isSmartFilterMode || isRootFilterMode;

  const primaryMatchedNodeIds = (() => {
    if (isRootFilterMode && effectiveRootEntryNodeId) {
      const rootPrefix = `${effectiveRootEntryNodeId} `;
      return allNodeIds.filter((nodeId) => (
        nodeId === effectiveRootEntryNodeId || nodeId.startsWith(rootPrefix)
      ));
    }
    if (isSectionFilterMode) {
      if (!activeSectionId || !sectionsById[activeSectionId]) return [] as string[];
      return allNodeIds.filter((nodeId) => getEffectiveSectionIds(nodeId).includes(activeSectionId));
    }
    if (isSmartFilterMode) {
      return getPrimaryMatchedNodeIds();
    }
    return allNodeIds;
  })();

  const displayNodeIdSet = (() => {
    if (!isPrimaryFilterActive) return new Set<string>(allNodeIds);
    if (isRootFilterMode) {
      const ids = new Set<string>(primaryMatchedNodeIds);
      if (effectiveRootEntryNodeId) {
        const sequenceTokens = effectiveRootEntryNodeId.split(' ').filter(Boolean);
        for (let i = 1; i < sequenceTokens.length; i += 1) {
          const ancestorId = sequenceTokens.slice(0, i).join(' ');
          if (nodes[ancestorId]) ids.add(ancestorId);
        }
      }
      return ids;
    }
    const ids = new Set<string>();
    primaryMatchedNodeIds.forEach((nodeId) => {
      const sequence = nodeId.split(' ').filter(Boolean);
      for (let i = 1; i <= sequence.length; i += 1) {
        const ancestorId = sequence.slice(0, i).join(' ');
        if (nodes[ancestorId]) ids.add(ancestorId);
      }
    });
    return ids;
  })();

  const effectiveSelectedNode =
    selectedNodeId && displayNodeIdSet.has(selectedNodeId) ? nodes[selectedNodeId] ?? null : null;
  const selectedSequence = effectiveSelectedNode?.context.sequence || [];
  
  const sortedNodes = Object.values(nodes).sort((a, b) => compareSequences(a.context.sequence, b.context.sequence));

  // Filter nodes based on search and expansion
  const visibleNodes = (() => {
    const visible: BiddingNode[] = [];
    let hiddenPrefixTokens: string[] | null = null;

    for (const node of sortedNodes) {
      const seq = node.context.sequence;
      const seqTokens = node.id.split(' ').filter(Boolean);

      if (isPrimaryFilterActive && !displayNodeIdSet.has(node.id)) {
        continue;
      }
      
      // If we are currently hiding descendants of a collapsed node
      if (hiddenPrefixTokens) {
        // Check if current node is a descendant
        let isDescendant = true;
        if (seqTokens.length <= hiddenPrefixTokens.length) {
          isDescendant = false;
        } else {
          for (let i = 0; i < hiddenPrefixTokens.length; i++) {
            if (seqTokens[i] !== hiddenPrefixTokens[i]) {
              isDescendant = false;
              break;
            }
          }
        }
        
        if (isDescendant) {
          // It's a descendant, but if there's a search query, we might want to show it anyway
          if (!searchQuery) continue;
        } else {
          // No longer a descendant, clear hidden prefix
          hiddenPrefixTokens = null;
        }
      }

      // Search filtering
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const sequenceText = seq.map((step) => (
          step.actor === 'opp' ? `(${step.call})` : step.call
        )).join(' ');
        const matchesSearch = sequenceText.toLowerCase().includes(query) || 
                              node.meaning?.notes?.toLowerCase().includes(query) ||
                              node.meaning?.shows?.join(' ').toLowerCase().includes(query);
        if (!matchesSearch) continue;
      }

      visible.push(node);

      // If this node is collapsed and we are not searching, hide its descendants
      if (!node.isExpanded && !searchQuery) {
        hiddenPrefixTokens = seqTokens;
      }
    }
    return visible;
  })();
  const depthBase = 0;

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center px-4 py-2 border-b border-slate-200 bg-white shrink-0 gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
          title="Undo (Ctrl/Cmd+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
          title="Redo (Shift+Ctrl/Cmd+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>
        <div className="h-4 w-px bg-slate-200 mx-0.5" />
        <button 
          onClick={expandAll}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Expand All"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
          <span>Expand All</span>
        </button>
        <button 
          onClick={collapseAll}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Collapse All"
        >
          <ChevronsDownUp className="w-3.5 h-3.5" />
          <span>Collapse All</span>
        </button>
        {(activeSection || activeSmartView || activeRootNode) && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1">
            <span className="text-xs font-medium text-blue-800">
              {activeSection
                ? `Section: ${activeSection.name}`
                : activeSmartView
                  ? `Smart: ${activeSmartView.name}`
                  : `Root: ${activeRootLabel}`}
            </span>
            <button
              type="button"
              onClick={() => {
                setLeftPrimaryMode('roots');
                setActiveRootEntryNodeId(null);
                setActiveSectionId(null);
                setActiveSmartViewId(null);
              }}
              className="text-[11px] text-blue-700 hover:text-blue-900"
            >
              Clear
            </button>
          </div>
        )}
        <div className="ml-auto inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('classic')}
            className={`h-7 px-2.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'classic'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Classic
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            className={`h-7 px-2.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'compact'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Compact lanes
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/70 shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Current Sequence</div>
        {selectedSequence.length > 0 ? (
          <div className="font-mono text-sm whitespace-nowrap overflow-x-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {selectedSequence.map((step, index) => {
              const nodeId = buildSequenceIdFromSteps(selectedSequence.slice(0, index + 1));
              const isActive = nodeId === effectiveSelectedNode?.id;
              const isExistingNode = !!nodes[nodeId];
              const isOpponent = step.actor === 'opp';
              const callLabel = isOpponent ? `(${formatCall(step.call)})` : formatCall(step.call);
              const callColorClass = isOpponent ? 'text-slate-500' : getSuitColor(step.call);

              return (
                <span key={`${nodeId}-${index}`} className="inline-flex items-center">
                  <button
                    type="button"
                    disabled={!isExistingNode}
                    onClick={() => {
                      if (isExistingNode) selectNode(nodeId);
                    }}
                    className={`transition-colors ${
                      isActive
                        ? `${callColorClass} font-semibold underline decoration-dotted underline-offset-2`
                        : `${callColorClass} hover:opacity-70`
                    } ${isExistingNode ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                    title={isExistingNode ? `Go to ${selectedSequence.slice(0, index + 1).map((item) => (
                      item.actor === 'opp' ? `(${formatCall(item.call)})` : formatCall(item.call)
                    )).join(' - ')}` : 'Sequence not found'}
                  >
                    {callLabel}
                  </button>
                <span className="text-slate-400 mx-1">-</span>
              </span>
              );
            })}
            <span className="text-slate-400">...</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400">Select a sequence to see full path</div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="md:min-w-max pb-10">
          {/* Header */}
          <div className="flex items-center px-4 py-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
            <div className="flex-1 min-w-[200px] md:min-w-[300px]">{viewMode === 'compact' ? 'Sequence (O/R)' : 'Sequence'}</div>
            <div className="hidden md:block w-24 text-center shrink-0">HCP</div>
            <div className="hidden md:block w-24 text-center shrink-0">Type</div>
            <div className="hidden md:block w-64 shrink-0">Notes</div>
            <div className="hidden md:block w-16 text-center shrink-0">Accepted</div>
          </div>
          
          {/* List */}
          <div className="flex flex-col">
            {visibleNodes.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-400">
                {isSectionFilterMode
                  ? 'No sequences in this section yet.'
                  : isSmartFilterMode
                    ? 'No sequences match this smart view.'
                    : isRootFilterMode
                      ? 'No continuations under this root entry yet.'
                    : 'No sequences to display.'}
              </div>
            ) : (
              visibleNodes.map(node => (
                <SequenceRow
                  key={node.id}
                  node={node}
                  viewMode={viewMode}
                  displayDepth={Math.max(0, node.context.sequence.length - 1 - depthBase)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
