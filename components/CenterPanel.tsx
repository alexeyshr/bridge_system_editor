import { useBiddingStore, BiddingNode } from '@/store/useBiddingStore';
import { compareSequences, formatCall, getSuitColor } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { SequenceRow } from './SequenceRow';
import { ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

type TreeViewMode = 'classic' | 'compact';

export function CenterPanel() {
  const {
    nodes,
    selectedNodeId,
    searchQuery,
    leftPrimaryMode,
    activeSmartViewId,
    expandAll,
    collapseAll,
    selectNode,
    evalSmartView,
    getSmartViews,
    setLeftPrimaryMode,
    setActiveSmartViewId,
  } = useBiddingStore();
  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;
  const selectedSequence = selectedNode?.context.sequence || [];
  const [viewMode, setViewMode] = useState<TreeViewMode>('classic');
  const smartViews = getSmartViews();
  const activeSmartView = leftPrimaryMode === 'smartViews' && activeSmartViewId
    ? smartViews.find((smartView) => smartView.id === activeSmartViewId) ?? null
    : null;
  
  const sortedNodes = useMemo(() => {
    return Object.values(nodes).sort((a, b) => compareSequences(a.context.sequence, b.context.sequence));
  }, [nodes]);

  // Filter nodes based on search and expansion
  const visibleNodes = useMemo(() => {
    const visible: BiddingNode[] = [];
    let hiddenPrefix: string[] | null = null;

    for (const node of sortedNodes) {
      const seq = node.context.sequence;
      
      // If we are currently hiding descendants of a collapsed node
      if (hiddenPrefix) {
        // Check if current node is a descendant
        let isDescendant = true;
        if (seq.length <= hiddenPrefix.length) {
          isDescendant = false;
        } else {
          for (let i = 0; i < hiddenPrefix.length; i++) {
            if (seq[i] !== hiddenPrefix[i]) {
              isDescendant = false;
              break;
            }
          }
        }
        
          if (isDescendant) {
            // It's a descendant, but if there's a search query, we might want to show it anyway
            if (!searchQuery && !activeSmartViewId) continue;
          } else {
            // No longer a descendant, clear hidden prefix
            hiddenPrefix = null;
          }
        }

      if (activeSmartView && !evalSmartView(node.id, activeSmartView.id)) {
        continue;
      }

      // Search filtering
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = seq.join(' ').toLowerCase().includes(query) || 
                              node.meaning?.notes?.toLowerCase().includes(query) ||
                              node.meaning?.shows?.join(' ').toLowerCase().includes(query);
        if (!matchesSearch) continue;
      }

      visible.push(node);

      // If this node is collapsed and we are not searching, hide its descendants
      if (!node.isExpanded && !searchQuery && !activeSmartViewId) {
        hiddenPrefix = seq;
      }
    }
    return visible;
  }, [sortedNodes, searchQuery, activeSmartView, activeSmartViewId, evalSmartView]);

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center px-4 py-2 border-b border-slate-200 bg-white shrink-0 gap-2">
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
        {activeSmartView && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1">
            <span className="text-xs font-medium text-blue-800">Smart: {activeSmartView.name}</span>
            <button
              type="button"
              onClick={() => {
                setLeftPrimaryMode('roots');
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
            {selectedSequence.map((call, index) => {
              const nodeId = selectedSequence.slice(0, index + 1).join(' ');
              const isActive = nodeId === selectedNodeId;
              const isExistingNode = !!nodes[nodeId];

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
                        ? `${getSuitColor(call)} font-semibold underline decoration-dotted underline-offset-2`
                        : `${getSuitColor(call)} hover:opacity-70`
                    } ${isExistingNode ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                    title={isExistingNode ? `Go to ${selectedSequence.slice(0, index + 1).map((item) => formatCall(item)).join(' - ')}` : 'Sequence not found'}
                  >
                    {formatCall(call)}
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
            {visibleNodes.map(node => (
              <SequenceRow key={node.id} node={node} viewMode={viewMode} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
