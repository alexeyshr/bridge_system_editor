import { BiddingNode, useBiddingStore } from '@/store/useBiddingStore';
import { formatCall, getSuitColor } from '@/lib/utils';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Bookmark,
  AlertTriangle,
  Trash2,
  FolderInput,
  Pin,
  PinOff,
} from 'lucide-react';
import { useState } from 'react';
import { NodeSectionAssignment } from './NodeSectionAssignment';
import {
  buildSequenceIdFromSteps,
  normalizeBiddingCall,
  type BiddingActor,
  type BiddingStep,
} from '@/lib/bidding-steps';
import { getMutationIntentUiMeta } from '@/lib/domain/bidding/mutation-intents';

type SequenceViewMode = 'classic' | 'compact';

const BID_SUITS = ['C', 'D', 'H', 'S', 'NT'] as const;
const BID_DISPLAY_SUITS = ['NT', 'S', 'H', 'D', 'C'] as const;
const SPECIAL_CALLS = ['Pass', 'X', 'XX'] as const;
const ALL_BID_CALLS = Array.from({ length: 7 }, (_, levelIdx) =>
  BID_DISPLAY_SUITS.map((suit) => `${levelIdx + 1}${suit}`)
).flat();

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

function getLastBidFromSequence(sequence: BiddingStep[]): string | null {
  for (let i = sequence.length - 1; i >= 0; i--) {
    const normalized = normalizeBiddingCall(sequence[i].call);
    if (normalized && isBidCall(normalized)) return normalized;
  }
  return null;
}

export function SequenceRow({
  node,
  viewMode = 'classic',
  displayDepth,
  batchModeEnabled = false,
}: {
  node: BiddingNode;
  viewMode?: SequenceViewMode;
  displayDepth?: number;
  batchModeEnabled?: boolean;
}) {
  const {
    selectedNodeId,
    selectedNodeIds,
    selectNode,
    toggleNodeSelection,
    setNodeSelection,
    toggleExpand,
    toggleBookmark,
    addNode,
    addRootEntry,
    removeRootEntry,
    deleteNode,
    nodes,
    rootEntryNodeIds,
  } = useBiddingStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSectionAssignOpen, setIsSectionAssignOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [continuationCall, setContinuationCall] = useState('');
  const [continuationActor, setContinuationActor] = useState<BiddingActor>('our');
  const [continuationError, setContinuationError] = useState('');
  const [quickAddCall, setQuickAddCall] = useState('');
  const [quickAddActor, setQuickAddActor] = useState<BiddingActor>('our');
  const [quickAddError, setQuickAddError] = useState('');

  const isSelected = selectedNodeId === node.id;
  const isMultiSelected = selectedNodeIds.includes(node.id);
  const seq = node.context.sequence;
  const sequencePathLabel = `${seq.map((step) => (
    step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)
  )).join('-')}-?`;
  const depth = displayDepth ?? (seq.length - 1);
  const lastStep = seq[seq.length - 1];
  const lastCall = lastStep.call;
  const isOpponentStep = lastStep.actor === 'opp';
  const ourTurnsCount = seq.reduce((acc, step) => acc + (step.actor === 'our' ? 1 : 0), 0);
  const isOpenerLaneTurn = ourTurnsCount % 2 === 1;
  const normalizedLastCall = normalizeBiddingCall(lastCall);
  const lastContractBid = getLastBidFromSequence(seq);
  const lastContractRank = lastContractBid ? getBidRank(lastContractBid) : -1;
  const canDouble = !!normalizedLastCall && isBidCall(normalizedLastCall);
  const canRedouble = normalizedLastCall === 'X';
  const compactLeftTitle = 'Opener';
  const compactRightTitle = 'Responder';
  const compactCallTextClass = isOpponentStep ? 'text-[#6b7280]' : getSuitColor(lastCall);
  const showRowActions = isHovered || isSelected || isMultiSelected || isAddFormOpen || isSectionAssignOpen || isDeleteDialogOpen || isQuickAddOpen;
  const isRootEntry = rootEntryNodeIds.includes(node.id);
  const actorMarkerLabel = isOpponentStep ? 'OPP' : (isOpenerLaneTurn ? 'OUR-O' : 'OUR-R');
  
  // Check if node has children
  const prefix = node.id + " ";
  const childrenCount = Object.keys(nodes).filter(key => key.startsWith(prefix) && key.split(" ").length === seq.length + 1).length;
  const hasChildren = childrenCount > 0;
  const descendantsCount = Object.keys(nodes).filter((key) => key === node.id || key.startsWith(prefix)).length - 1;
  const deleteIntentMeta = getMutationIntentUiMeta('delete-node');

  const getContinuationStatus = (inputCall: string, actor: BiddingActor) => {
    const call = normalizeBiddingCall(inputCall);
    if (!call) {
      return { type: 'invalid' as const, message: 'Use 1C..7NT, Pass, X, XX.' };
    }

    const newNodeId = buildSequenceIdFromSteps([
      ...seq,
      { call, actor },
    ]);
    if (nodes[newNodeId]) {
      return { type: 'duplicate' as const, message: 'Duplicate continuation: this path already exists.' };
    }

    if (isBidCall(call)) {
      if (getBidRank(call) > lastContractRank) {
        return { type: 'legal' as const, message: 'Legal call.' };
      }
      return {
        type: 'illegal' as const,
        message: lastContractBid ? `Illegal: must be higher than ${formatCall(lastContractBid)}.` : 'Illegal bid at this point.',
      };
    }
    if (call === 'Pass') return { type: 'legal' as const, message: 'Legal call.' };
    if (call === 'X') {
      return canDouble
        ? { type: 'legal' as const, message: 'Legal call.' }
        : { type: 'illegal' as const, message: 'Illegal: X is available only directly over a bid.' };
    }
    if (call === 'XX') {
      return canRedouble
        ? { type: 'legal' as const, message: 'Legal call.' }
        : { type: 'illegal' as const, message: 'Illegal: XX is available only directly over X.' };
    }
    return { type: 'illegal' as const, message: 'Illegal call at this point.' };
  };

  const tryAddContinuation = (
    inputCall: string,
    actor: BiddingActor,
    setError: (message: string) => void,
  ): boolean => {
    const status = getContinuationStatus(inputCall, actor);
    if (status.type !== 'legal') {
      setError(status.message);
      return false;
    }
    const parsedCall = normalizeBiddingCall(inputCall);
    if (!parsedCall) {
      setError('Use 1C..7NT, Pass, X, XX.');
      return false;
    }
    addNode(node.id, parsedCall, actor);
    return true;
  };

  const submitContinuation = () => {
    if (!tryAddContinuation(continuationCall, continuationActor, setContinuationError)) return;
    setContinuationCall('');
    setContinuationActor('our');
    setContinuationError('');
    setIsAddFormOpen(false);
  };

  const submitQuickAdd = () => {
    if (!tryAddContinuation(quickAddCall, quickAddActor, setQuickAddError)) return;
    setQuickAddCall('');
    setQuickAddActor('our');
    setQuickAddError('');
    setIsQuickAddOpen(false);
  };

  const handleOpenAddForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSectionAssignOpen(false);
    setIsQuickAddOpen(false);
    setIsAddFormOpen(true);
    setContinuationCall('');
    setContinuationActor('our');
    setContinuationError('');
  };

  const handleOpenQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSectionAssignOpen(false);
    setIsAddFormOpen(false);
    setIsQuickAddOpen(true);
    setQuickAddCall('');
    setQuickAddActor('our');
    setQuickAddError('');
  };

  const handleOpenSectionAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddFormOpen(false);
    setIsQuickAddOpen(false);
    setIsSectionAssignOpen((prev) => !prev);
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

  const handleToggleRootEntry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRootEntry) {
      removeRootEntry(node.id);
      return;
    }
    addRootEntry(node.id);
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

  const handleRowClick = (event: React.MouseEvent) => {
    const isMultiToggle = batchModeEnabled && (event.metaKey || event.ctrlKey);
    if (isMultiToggle) {
      toggleNodeSelection(node.id);
      return;
    }
    setNodeSelection([node.id]);
    selectNode(node.id);
  };

  const continuationStatus = continuationCall
    ? getContinuationStatus(continuationCall, continuationActor)
    : null;

  return (
    <div 
      className={`flex flex-col md:flex-row md:items-center px-4 py-2 md:py-1.5 border-b border-[#f0f0f0] cursor-pointer text-sm transition-colors group ${
        (isSelected || isMultiSelected) ? 'bg-[#1f2734]/5' : 'hover:bg-[#fafbfc]'
      }`}
      onClick={handleRowClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sequence Column */}
      <div className="flex-1 min-w-[200px] md:min-w-[300px] flex items-center font-mono text-[13px]">
        <div style={{ width: `${depth * 20}px` }} className="shrink-0 border-l border-[#e5e7eb] h-full ml-2" />

        {batchModeEnabled && (
          <input
            type="checkbox"
            checked={isMultiSelected}
            onChange={() => {
              toggleNodeSelection(node.id);
            }}
            onClick={(event) => event.stopPropagation()}
            className="mr-1.5 h-3.5 w-3.5 rounded border-[#d1d5db] text-[#1f2734] focus:ring-[#6b7280]/20"
            data-tooltip="Select for batch actions"
          />
        )}
        
        <button 
          className={`w-5 h-5 flex items-center justify-center rounded hover:bg-[#e5e7eb] shrink-0 ${hasChildren ? 'text-[#6b7280]' : 'opacity-0 cursor-default'}`}
          onClick={hasChildren ? handleToggleExpand : undefined}
        >
          {hasChildren && (node.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>

        {viewMode === 'compact' ? (
          <div className="flex items-center gap-1.5 ml-1">
            {depth > 0 && <span className="text-[#d1d5db]">→</span>}
            {isOpponentStep ? (
              <span
                className="min-w-[84px] h-5 px-1.5 rounded-md border border-[#d1d5db] bg-[#f3f4f6] text-[10px] font-semibold text-[#6b7280] flex items-center justify-center"
                data-tooltip="Opponent"
              >
                ({formatCall(lastCall)})
              </span>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                <span
                  className={`min-w-[40px] h-5 px-1 rounded-md border text-[10px] font-semibold flex items-center justify-center ${
                    isOpenerLaneTurn
                      ? `${compactCallTextClass} border-[#d1d5db] bg-white`
                      : 'text-[#d1d5db] border-[#e5e7eb] bg-[#fafbfc]'
                  }`}
                  data-tooltip={compactLeftTitle}
                >
                  {isOpenerLaneTurn ? formatCall(lastCall) : '·'}
                </span>
                <span
                  className={`min-w-[40px] h-5 px-1 rounded-md border text-[10px] font-semibold flex items-center justify-center ${
                    !isOpenerLaneTurn
                      ? `${compactCallTextClass} border-[#d1d5db] bg-[#f3f4f6]`
                      : 'text-[#d1d5db] border-[#e5e7eb] bg-[#fafbfc]'
                  }`}
                  data-tooltip={compactRightTitle}
                >
                  {!isOpenerLaneTurn ? formatCall(lastCall) : '·'}
                </span>
              </div>
            )}
            {node.meaning?.alert && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-0.5" />
            )}
            <span className="ml-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] rounded px-1 py-0.5 leading-none">
              {actorMarkerLabel}
            </span>
            {childrenCount > 0 && (
              <span 
                className="ml-0.5 text-[9px] font-bold text-[#9ca3af] bg-[#f3f4f6] px-1.5 py-0.5 rounded-full leading-none"
                data-tooltip={`${childrenCount} continuation${childrenCount > 1 ? 's' : ''}`}
              >
                {childrenCount}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 ml-1">
            {depth > 0 && <span className="text-[#9ca3af]">→</span>}
            <span className={`font-semibold ${lastStep.actor === 'opp' ? 'text-[#6b7280]' : getSuitColor(lastCall)}`}>
              {lastStep.actor === 'opp' ? `(${formatCall(lastCall)})` : formatCall(lastCall)}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] rounded px-1 py-0.5 leading-none">
              {actorMarkerLabel}
            </span>
            {node.meaning?.alert && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-1" />
            )}
            {childrenCount > 0 && (
              <span 
                className="ml-1 text-[9px] font-bold text-[#9ca3af] bg-[#f3f4f6] px-1.5 py-0.5 rounded-full leading-none"
                data-tooltip={`${childrenCount} continuation${childrenCount > 1 ? 's' : ''}`}
              >
                {childrenCount}
              </span>
            )}
          </div>
        )}

        {/* Hover Actions */}
        <div
          className={`ml-4 flex items-center gap-1 transition-opacity ${
            showRowActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button 
            className="p-1 text-[#9ca3af] hover:text-[#1f2734] hover:bg-[#1f2734]/10 rounded"
            onClick={handleOpenAddForm}
            data-tooltip="Add continuation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            className="px-1.5 h-5 text-[10px] font-semibold text-[#1f2734] bg-[#1f2734]/5 border border-[#1f2734]/20 hover:bg-[#1f2734]/10 rounded"
            onClick={handleOpenQuickAdd}
            data-tooltip="Quick add inline"
          >
            Quick
          </button>
          <button 
            className={`p-1 rounded ${node.isBookmarked ? 'text-[#1f2734]' : 'text-[#9ca3af] hover:text-[#1f2734] hover:bg-[#1f2734]/10'}`}
            onClick={handleToggleBookmark}
            data-tooltip="Bookmark"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1 rounded ${
              isRootEntry
                ? 'text-indigo-600 bg-indigo-100'
                : 'text-[#9ca3af] hover:text-indigo-600 hover:bg-indigo-100'
            }`}
            onClick={handleToggleRootEntry}
            data-tooltip={isRootEntry ? 'Remove from roots' : 'Add to roots'}
          >
            {isRootEntry ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            className="p-1 text-[#9ca3af] hover:text-[#1f2734] hover:bg-[#1f2734]/10 rounded"
            onClick={handleOpenSectionAssign}
            data-tooltip="Assign sections"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1 text-[#9ca3af] hover:text-red-600 hover:bg-red-100 rounded"
            onClick={handleDelete}
            data-tooltip="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isQuickAddOpen && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitQuickAdd();
          }}
          className="mt-1 ml-8 md:ml-10 mr-2 md:mr-0 w-full max-w-[340px] rounded-md border border-[#1f2734]/20 bg-[#1f2734]/5/70 px-2 py-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-1 mb-1">
            <button
              type="button"
              onClick={() => setQuickAddActor('our')}
              className={`h-6 px-2 text-[10px] rounded border ${
                quickAddActor === 'our'
                  ? 'border-[#1f2734]/20 bg-white text-[#1f2734]'
                  : 'border-[#e5e7eb] bg-[#f3f4f6] text-[#6b7280]'
              }`}
            >
              Our
            </button>
            <button
              type="button"
              onClick={() => setQuickAddActor('opp')}
              className={`h-6 px-2 text-[10px] rounded border ${
                quickAddActor === 'opp'
                  ? 'border-[#1f2734]/20 bg-white text-[#1f2734]'
                  : 'border-[#e5e7eb] bg-[#f3f4f6] text-[#6b7280]'
              }`}
            >
              Opp
            </button>
            <input
              autoFocus
              type="text"
              value={quickAddCall}
              onChange={(event) => {
                setQuickAddCall(event.target.value);
                if (quickAddError) setQuickAddError('');
              }}
              placeholder="Quick add: 2H, 3NT, Pass"
              className="min-w-0 flex-1 h-6 px-2 text-[11px] bg-white border border-[#e5e7eb] rounded focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
            <button
              type="submit"
              className="h-6 px-2 text-[10px] font-semibold text-white bg-[#1f2734] hover:bg-[#374151] rounded"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsQuickAddOpen(false);
                setQuickAddCall('');
                setQuickAddActor('our');
                setQuickAddError('');
              }}
              className="h-6 px-2 text-[10px] text-[#6b7280] border border-[#e5e7eb] bg-white hover:bg-[#f3f4f6] rounded"
            >
              Close
            </button>
          </div>
          {quickAddError && (
            <div className="text-[10px] text-rose-600">{quickAddError}</div>
          )}
        </form>
      )}

      {isAddFormOpen && (
        <div
          className="mt-2 md:mt-1 ml-8 md:ml-10 mr-2 md:mr-0 w-full max-w-[250px] rounded-lg border border-[#1f2734]/20 bg-gradient-to-r from-[#fafbfc] to-white p-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[9px] uppercase tracking-wider text-[#6b7280] mb-1.5 font-semibold">
            Add continuation after <span className={`${lastStep.actor === 'opp' ? 'text-[#6b7280]' : getSuitColor(lastCall)} font-bold`}>
              {lastStep.actor === 'opp' ? `(${formatCall(lastCall)})` : formatCall(lastCall)}
            </span>
          </div>
          <div className="mb-2 font-mono text-[11px] text-[#374151] break-all">
            {sequencePathLabel}
          </div>
          <div className="mb-1.5 inline-flex rounded-md border border-[#e5e7eb] bg-[#f3f4f6] p-0.5">
            <button
              type="button"
              onClick={() => setContinuationActor('our')}
              className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                continuationActor === 'our'
                  ? 'bg-white text-[#1f2734] shadow-sm'
                  : 'text-[#6b7280] hover:text-[#374151]'
              }`}
            >
              Our call
            </button>
            <button
              type="button"
              onClick={() => setContinuationActor('opp')}
              className={`h-6 px-2 text-[10px] font-medium rounded transition-colors ${
                continuationActor === 'opp'
                  ? 'bg-white text-[#1f2734] shadow-sm'
                  : 'text-[#6b7280] hover:text-[#374151]'
              }`}
            >
              Opponent call
            </button>
          </div>

          <div className="mb-1.5">
            <div className="text-[9px] text-[#6b7280] mb-0.5 font-medium uppercase tracking-wider">Bids 1C - 7NT</div>
            <div className="grid grid-cols-5 gap-1">
              {ALL_BID_CALLS.map((call) => {
                const callStatus = getContinuationStatus(call, continuationActor);
                const isAvailable = callStatus.type === 'legal';
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
                        ? 'border-[#1f2734]/20 bg-[#1f2734]/10 text-[#1f2734]'
                        : isAvailable
                          ? `border-[#e5e7eb] bg-white hover:border-[#d1d5db] ${getSuitColor(call)}`
                          : 'border-[#e5e7eb] bg-[#f3f4f6] text-[#d1d5db] cursor-not-allowed opacity-60'
                    }`}
                    data-tooltip={
                      isAvailable
                        ? `Add ${formatCall(call)}`
                        : callStatus.message
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
              const callStatus = getContinuationStatus(call, continuationActor);
              const isAvailable = callStatus.type === 'legal';
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
                      ? 'border-[#1f2734]/20 bg-[#1f2734]/10 text-[#1f2734]'
                      : isAvailable
                        ? 'border-[#e5e7eb] bg-white hover:border-[#d1d5db] text-[#374151]'
                        : 'border-[#e5e7eb] bg-[#f3f4f6] text-[#d1d5db] cursor-not-allowed opacity-60'
                  }`}
                  data-tooltip={isAvailable ? `Add ${formatCall(call)}` : callStatus.message}
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
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1"
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
                  setContinuationActor('our');
                  setContinuationError('');
                }
              }}
              placeholder="e.g. 2H, 2NT, 3C"
              className="min-w-0 h-7 px-2 text-[11px] bg-white border border-[#e5e7eb] rounded-md focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
            <button
              type="button"
              onClick={() => {
                setIsAddFormOpen(false);
                setContinuationCall('');
                setContinuationActor('our');
                setContinuationError('');
              }}
              className="h-7 px-2.5 shrink-0 text-[11px] font-medium text-[#6b7280] hover:text-[#1f2734] bg-white border border-[#e5e7eb] hover:bg-[#f3f4f6] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-7 px-3 shrink-0 text-[11px] font-semibold text-white bg-[#1f2734] hover:bg-[#374151] rounded-md transition-colors"
            >
              Add
            </button>
          </form>

          {continuationStatus && (
            <div
              className={`mt-1 text-[10px] ${
                continuationStatus.type === 'legal'
                  ? 'text-emerald-600'
                  : continuationStatus.type === 'duplicate'
                    ? 'text-amber-600'
                    : 'text-rose-600'
              }`}
            >
              {continuationStatus.message}
            </div>
          )}

          {continuationError && (
            <div className="mt-1 text-[10px] text-red-600">{continuationError}</div>
          )}
        </div>
      )}

      {isSectionAssignOpen && (
        <div
          className="mt-2 md:mt-1 ml-8 md:ml-10 mr-2 md:mr-0 w-full max-w-[300px] rounded-lg border border-[#e5e7eb] bg-white p-2.5 shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
              Assign Sections
            </div>
            <button
              type="button"
              onClick={() => setIsSectionAssignOpen(false)}
              className="h-6 px-2 rounded-md border border-[#e5e7eb] text-[10px] text-[#6b7280] hover:bg-[#f3f4f6]"
            >
              Close
            </button>
          </div>
          <NodeSectionAssignment nodeId={node.id} compact />
        </div>
      )}

      {/* Mobile Details Row */}
      <div className="flex md:hidden items-center gap-2 mt-1.5 pl-8 text-xs text-[#6b7280] overflow-hidden">
        {node.meaning?.hcp?.min !== undefined && (
           <span className="font-mono bg-[#f3f4f6] px-1.5 py-0.5 rounded shrink-0">
             {node.meaning.hcp.min}{node.meaning.hcp.max ? `–${node.meaning.hcp.max}` : '+'} HCP
           </span>
        )}
        {node.meaning?.forcing && (
          <span className={`px-1.5 py-0.5 rounded font-semibold shrink-0 ${
            node.meaning.forcing === 'NF' ? 'bg-[#f3f4f6] text-[#6b7280]' :
            node.meaning.forcing === '1RF' ? 'bg-[#1f2734]/10 text-[#1f2734]' :
            node.meaning.forcing === 'GF' ? 'bg-red-100 text-red-700' :
            node.meaning.forcing === 'INV' ? 'bg-amber-100 text-amber-700' :
            'bg-[#f3f4f6] text-[#6b7280]'
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
      <div className="hidden md:block w-24 text-center shrink-0 text-[#6b7280] font-mono text-xs">
        {node.meaning?.hcp?.min !== undefined && node.meaning?.hcp?.max !== undefined ? (
          <>{node.meaning.hcp.min}{node.meaning.hcp.max ? `–${node.meaning.hcp.max}` : '+'}</>
        ) : '-'}
      </div>

      {/* Type Column */}
      <div className="hidden md:flex w-24 text-center shrink-0 flex-col items-center justify-center gap-0.5">
        {node.meaning?.forcing && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            node.meaning.forcing === 'NF' ? 'bg-[#f3f4f6] text-[#6b7280]' :
            node.meaning.forcing === '1RF' ? 'bg-[#1f2734]/10 text-[#1f2734]' :
            node.meaning.forcing === 'GF' ? 'bg-red-100 text-red-700' :
            node.meaning.forcing === 'INV' ? 'bg-amber-100 text-amber-700' :
            'bg-[#f3f4f6] text-[#6b7280]'
          }`}>
            {node.meaning.forcing}
          </span>
        )}
        {node.meaning?.type && (
          <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">
            {node.meaning.type}
          </span>
        )}
      </div>

      {/* Notes Column */}
      <div className="hidden md:block w-64 shrink-0 text-[#6b7280] truncate text-xs pr-4">
        {node.meaning?.shows && node.meaning.shows.length > 0 ? (
          <span className="font-medium text-[#374151]">{node.meaning.shows[0]}</span>
        ) : (
          node.meaning?.notes || <span className="text-[#d1d5db] italic">No notes</span>
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
          className="w-3.5 h-3.5 text-[#1f2734] rounded border-[#d1d5db] focus:ring-[#6b7280]/20"
        />
      </div>

      {isDeleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1f2734]/20 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setIsDeleteDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete sequence confirmation"
            className="w-full max-w-md rounded-xl border border-[#e5e7eb] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#f0f0f0]">
              <div className="text-sm font-semibold text-[#1f2734]">{deleteIntentMeta.title}</div>
              <div className="text-xs text-[#6b7280] mt-0.5">
                {seq.map((step, i) => (
                  <span key={`${node.id}-delete-${i}`} className="inline-flex items-center">
                    <span className={step.actor === 'opp' ? 'text-[#6b7280]' : getSuitColor(step.call)}>
                      {step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)}
                    </span>
                    {i < seq.length - 1 && <span className="mx-1 text-[#9ca3af]">-</span>}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-4 py-3 text-sm text-[#6b7280]">
              This will permanently remove this call
              {descendantsCount > 0 ? ` and ${descendantsCount} continuation${descendantsCount > 1 ? 's' : ''}` : ''}.
            </div>
            <div className="px-4 py-3 border-t border-[#f0f0f0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="h-8 px-3 text-sm font-medium text-[#374151] bg-white border border-[#e5e7eb] hover:bg-[#fafbfc] rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className={`h-8 px-3 text-sm font-semibold text-white rounded-md transition-colors ${deleteIntentMeta.confirmButtonClassName}`}
              >
                {deleteIntentMeta.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
