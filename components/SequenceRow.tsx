import { BiddingNode, useBiddingStore } from '@/store/useBiddingStore';
import { formatCall, getSuitColor } from '@/lib/utils';
import { ChevronRight, ChevronDown, Plus, Bookmark, AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';

type SequenceViewMode = 'classic' | 'compact';

const BID_SUITS = ['C', 'D', 'H', 'S', 'NT'] as const;
const SPECIAL_CALLS = ['Pass', 'X', 'XX'] as const;
const ALL_BID_CALLS = Array.from({ length: 7 }, (_, levelIdx) =>
  BID_SUITS.map((suit) => `${levelIdx + 1}${suit}`)
).flat();

function normalizeCall(rawValue: string): string | null {
  const normalized = rawValue
    .trim()
    .toUpperCase()
    .replace(/♣/g, 'C')
    .replace(/♦/g, 'D')
    .replace(/♥/g, 'H')
    .replace(/♠/g, 'S')
    .replace(/\s+/g, '');

  if (normalized === 'PASS' || normalized === 'P') return 'Pass';
  if (normalized === 'X' || normalized === 'XX') return normalized;

  const match = normalized.match(/^([1-7])(C|D|H|S|NT)$/);
  if (!match) return null;
  return `${match[1]}${match[2]}`;
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

function getLastBidFromSequence(sequence: string[]): string | null {
  for (let i = sequence.length - 1; i >= 0; i--) {
    const normalized = normalizeCall(sequence[i]);
    if (normalized && isBidCall(normalized)) return normalized;
  }
  return null;
}

export function SequenceRow({ node, viewMode = 'classic' }: { node: BiddingNode; viewMode?: SequenceViewMode }) {
  const { selectedNodeId, selectNode, toggleExpand, toggleBookmark, addNode, deleteNode, nodes } = useBiddingStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [continuationCall, setContinuationCall] = useState('');
  const [continuationError, setContinuationError] = useState('');

  const isSelected = selectedNodeId === node.id;
  const seq = node.context.sequence;
  const sequencePathLabel = `${seq.map((call) => formatCall(call)).join('-')}-?`;
  const depth = seq.length - 1;
  const lastCall = seq[seq.length - 1];
  const normalizedLastCall = normalizeCall(lastCall);
  const lastContractBid = getLastBidFromSequence(seq);
  const lastContractRank = lastContractBid ? getBidRank(lastContractBid) : -1;
  const canDouble = !!normalizedLastCall && isBidCall(normalizedLastCall);
  const canRedouble = normalizedLastCall === 'X';
  const isOpenerTurn = depth % 2 === 0;
  
  // Check if node has children
  const prefix = node.id + " ";
  const childrenCount = Object.keys(nodes).filter(key => key.startsWith(prefix) && key.split(" ").length === seq.length + 1).length;
  const hasChildren = childrenCount > 0;
  const descendantsCount = Object.keys(nodes).filter((key) => key === node.id || key.startsWith(prefix)).length - 1;

  const isCallAvailable = (call: string) => {
    const newNodeId = [...seq, call].join(' ');
    if (nodes[newNodeId]) return false;

    if (isBidCall(call)) {
      return getBidRank(call) > lastContractRank;
    }
    if (call === 'Pass') return true;
    if (call === 'X') return canDouble;
    if (call === 'XX') return canRedouble;
    return false;
  };

  const submitContinuation = () => {
    const parsedCall = normalizeCall(continuationCall);
    if (!parsedCall) {
      setContinuationError('Use: 1C..7NT, Pass, X or XX');
      return;
    }

    const newNodeId = [...seq, parsedCall].join(' ');
    if (nodes[newNodeId]) {
      setContinuationError('This continuation already exists');
      return;
    }
    if (!isCallAvailable(parsedCall)) {
      if (isBidCall(parsedCall)) {
        setContinuationError(lastContractBid ? `Must be higher than ${formatCall(lastContractBid)}` : 'Bid is not available here');
      } else if (parsedCall === 'X') {
        setContinuationError('X is available only directly over a bid');
      } else if (parsedCall === 'XX') {
        setContinuationError('XX is available only directly over X');
      } else {
        setContinuationError('This call is not available here');
      }
      return;
    }

    addNode(node.id, parsedCall);
    setContinuationCall('');
    setContinuationError('');
    setIsAddFormOpen(false);
  };

  const handleOpenAddForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddFormOpen(true);
    setContinuationCall('');
    setContinuationError('');
  };

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark(node.id);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpand(node.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(node.id);
    setIsDeleteDialogOpen(false);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(false);
  };

  return (
    <div 
      className={`flex flex-col md:flex-row md:items-center px-4 py-2 md:py-1.5 border-b border-slate-100 cursor-pointer text-sm transition-colors group ${
        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
      }`}
      onClick={() => selectNode(node.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sequence Column */}
      <div className="flex-1 min-w-[200px] md:min-w-[300px] flex items-center font-mono text-[13px]">
        <div style={{ width: `${depth * 20}px` }} className="shrink-0 border-l border-slate-200 h-full ml-2" />
        
        <button 
          className={`w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 shrink-0 ${hasChildren ? 'text-slate-500' : 'opacity-0 cursor-default'}`}
          onClick={hasChildren ? handleToggleExpand : undefined}
        >
          {hasChildren && (node.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>

        {viewMode === 'compact' ? (
          <div className="flex items-center gap-1.5 ml-1">
            {depth > 0 && <span className="text-slate-300">→</span>}
            <div className="grid grid-cols-2 gap-1">
              <span
                className={`min-w-[40px] h-5 px-1 rounded-md border text-[10px] font-semibold flex items-center justify-center ${
                  isOpenerTurn
                    ? `${getSuitColor(lastCall)} border-slate-300 bg-white`
                    : 'text-slate-300 border-slate-200 bg-slate-50'
                }`}
                title="Opener"
              >
                {isOpenerTurn ? formatCall(lastCall) : '·'}
              </span>
              <span
                className={`min-w-[40px] h-5 px-1 rounded-md border text-[10px] font-semibold flex items-center justify-center ${
                  !isOpenerTurn
                    ? `${getSuitColor(lastCall)} border-slate-300 bg-white`
                    : 'text-slate-300 border-slate-200 bg-slate-50'
                }`}
                title="Responder"
              >
                {!isOpenerTurn ? formatCall(lastCall) : '·'}
              </span>
            </div>
            {node.meaning?.alert && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-0.5" />
            )}
            {childrenCount > 0 && (
              <span 
                className="ml-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full leading-none"
                title={`${childrenCount} continuation${childrenCount > 1 ? 's' : ''}`}
              >
                {childrenCount}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 ml-1">
            {depth > 0 && <span className="text-slate-400">→</span>}
            <span className={`font-semibold ${getSuitColor(lastCall)}`}>
              {formatCall(lastCall)}
            </span>
            {node.meaning?.alert && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-1" />
            )}
            {childrenCount > 0 && (
              <span 
                className="ml-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full leading-none"
                title={`${childrenCount} continuation${childrenCount > 1 ? 's' : ''}`}
              >
                {childrenCount}
              </span>
            )}
          </div>
        )}

        {/* Hover Actions */}
        <div className={`ml-4 flex items-center gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded"
            onClick={handleOpenAddForm}
            title="Add continuation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button 
            className={`p-1 rounded ${node.isBookmarked ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-100'}`}
            onClick={handleToggleBookmark}
            title="Bookmark"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isAddFormOpen && (
        <div
          className="mt-2 md:mt-1 ml-8 md:ml-10 mr-2 md:mr-0 w-full max-w-[250px] rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50 p-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5 font-semibold">
            Add continuation after <span className={`${getSuitColor(lastCall)} font-bold`}>{formatCall(lastCall)}</span>
          </div>
          <div className="mb-2 font-mono text-[11px] text-slate-700 break-all">
            {sequencePathLabel}
          </div>

          <div className="mb-1.5">
            <div className="text-[9px] text-slate-500 mb-0.5 font-medium uppercase tracking-wider">Bids 1C - 7NT</div>
            <div className="grid grid-cols-5 gap-1">
              {ALL_BID_CALLS.map((call) => {
                const isAvailable = isCallAvailable(call);
                const isSelectedCall = continuationCall === call;
                return (
                  <button
                    key={call}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => {
                      setContinuationCall(call);
                      setContinuationError('');
                    }}
                    className={`h-6 px-1 rounded-md text-[10px] border transition-colors ${
                      isSelectedCall
                        ? 'border-blue-300 bg-blue-100 text-blue-700'
                        : isAvailable
                          ? `border-slate-200 bg-white hover:border-slate-300 ${getSuitColor(call)}`
                          : 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                    }`}
                    title={
                      isAvailable
                        ? `Add ${formatCall(call)}`
                        : lastContractBid
                          ? `Unavailable (must be above ${formatCall(lastContractBid)})`
                          : 'Unavailable'
                    }
                  >
                    {formatCall(call)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-1.5">
            {SPECIAL_CALLS.map((call) => {
              const isAvailable = isCallAvailable(call);
              const isSelectedCall = continuationCall === call;
              return (
                <button
                  key={call}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    setContinuationCall(call);
                    setContinuationError('');
                  }}
                  className={`h-6 px-2 rounded-md text-[10px] border transition-colors ${
                    isSelectedCall
                      ? 'border-blue-300 bg-blue-100 text-blue-700'
                      : isAvailable
                        ? 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        : 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  {formatCall(call)}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitContinuation();
            }}
            className="flex items-center gap-1"
          >
            <input
              autoFocus
              type="text"
              value={continuationCall}
              onChange={(e) => {
                setContinuationCall(e.target.value);
                if (continuationError) setContinuationError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsAddFormOpen(false);
                  setContinuationCall('');
                  setContinuationError('');
                }
              }}
              placeholder="e.g. 2H, 2NT, 3C"
              className="flex-1 h-7 px-2 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="h-7 px-3 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddFormOpen(false);
                setContinuationCall('');
                setContinuationError('');
              }}
              className="h-7 px-2.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
          </form>

          {continuationError && (
            <div className="mt-1 text-[10px] text-red-600">{continuationError}</div>
          )}
        </div>
      )}

      {/* Mobile Details Row */}
      <div className="flex md:hidden items-center gap-2 mt-1.5 pl-8 text-xs text-slate-500 overflow-hidden">
        {node.meaning?.hcp?.min !== undefined && (
           <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
             {node.meaning.hcp.min}{node.meaning.hcp.max ? `–${node.meaning.hcp.max}` : '+'} HCP
           </span>
        )}
        {node.meaning?.forcing && (
          <span className={`px-1.5 py-0.5 rounded font-semibold shrink-0 ${
            node.meaning.forcing === 'NF' ? 'bg-slate-100 text-slate-600' :
            node.meaning.forcing === '1RF' ? 'bg-blue-100 text-blue-700' :
            node.meaning.forcing === 'GF' ? 'bg-red-100 text-red-700' :
            node.meaning.forcing === 'INV' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {node.meaning.forcing}
          </span>
        )}
        <span className="truncate flex-1">
          {node.meaning?.shows && node.meaning.shows.length > 0 ? node.meaning.shows[0] : node.meaning?.notes || ''}
        </span>
      </div>

      {/* Desktop Columns */}
      {/* HCP Column */}
      <div className="hidden md:block w-24 text-center shrink-0 text-slate-600 font-mono text-xs">
        {node.meaning?.hcp?.min !== undefined && node.meaning?.hcp?.max !== undefined ? (
          <>{node.meaning.hcp.min}{node.meaning.hcp.max ? `–${node.meaning.hcp.max}` : '+'}</>
        ) : '-'}
      </div>

      {/* Type Column */}
      <div className="hidden md:flex w-24 text-center shrink-0 flex-col items-center justify-center gap-0.5">
        {node.meaning?.forcing && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            node.meaning.forcing === 'NF' ? 'bg-slate-100 text-slate-600' :
            node.meaning.forcing === '1RF' ? 'bg-blue-100 text-blue-700' :
            node.meaning.forcing === 'GF' ? 'bg-red-100 text-red-700' :
            node.meaning.forcing === 'INV' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {node.meaning.forcing}
          </span>
        )}
        {node.meaning?.type && (
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            {node.meaning.type}
          </span>
        )}
      </div>

      {/* Notes Column */}
      <div className="hidden md:block w-64 shrink-0 text-slate-600 truncate text-xs pr-4">
        {node.meaning?.shows && node.meaning.shows.length > 0 ? (
          <span className="font-medium text-slate-700">{node.meaning.shows[0]}</span>
        ) : (
          node.meaning?.notes || <span className="text-slate-300 italic">No notes</span>
        )}
      </div>

      {/* Accepted Column */}
      <div className="hidden md:block w-16 text-center shrink-0">
        <input 
          type="checkbox" 
          checked={!!node.meaning?.accepted} 
          onChange={(e) => {
            const { updateNode } = useBiddingStore.getState();
            updateNode(node.id, {
              meaning: { ...node.meaning, accepted: e.target.checked }
            });
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
        />
      </div>

      {isDeleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setIsDeleteDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete sequence confirmation"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">Delete sequence?</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {seq.map((call, i) => (
                  <span key={`${node.id}-delete-${i}`} className="inline-flex items-center">
                    <span className={getSuitColor(call)}>{formatCall(call)}</span>
                    {i < seq.length - 1 && <span className="mx-1 text-slate-400">-</span>}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 text-sm text-slate-600">
              This will permanently remove this call
              {descendantsCount > 0 ? ` and ${descendantsCount} continuation${descendantsCount > 1 ? 's' : ''}` : ''}.
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="h-8 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-8 px-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
