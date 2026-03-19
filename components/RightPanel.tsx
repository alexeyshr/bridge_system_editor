import { useBiddingStore } from '@/store/useBiddingStore';
import { formatCall, getSuitColor } from '@/lib/utils';
import { X, CheckCircle2, Trash2, AlertTriangle, Reply, CornerDownRight, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { SegmentedToggle } from '@/components/ui/segmented-toggle';


const compactInput = "h-7 w-full rounded-md border border-[#e5e7eb] bg-white px-2 text-[11px] text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
const sectionLabel = "text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] mb-1.5"

function MiniSelect({ value, onChange, options }: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-7 w-full flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-white px-2 text-[11px] text-[#1f2734] transition hover:border-[#d1d5db] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <ChevronDown className={`w-3 h-3 text-[#6b7280] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-[#e5e7eb] bg-white shadow-lg py-1 max-h-48 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full px-2 py-1 text-left text-[11px] flex items-center gap-1.5 transition-colors ${
                opt.value === value
                  ? 'bg-[#f3f4f6] text-[#1f2734] font-medium'
                  : 'text-[#374151] hover:bg-[#f3f4f6]'
              }`}
            >
              {opt.value === value && <Check className="w-3 h-3 text-[#1f2734] shrink-0" />}
              {opt.value !== value && <span className="w-3 shrink-0" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RightPanel() {
  const { nodes, selectedNodeId, selectNode, updateNode, deleteNode, addNode, toggleRightPanel } = useBiddingStore();

  const node = selectedNodeId ? nodes[selectedNodeId] : null;
  const seq = node?.context.sequence || [];

  const [replyState, setReplyState] = useState<{ nodeId: string | null; commentId: string | null }>({
    nodeId: selectedNodeId,
    commentId: null
  });
  const replyingTo = replyState.nodeId === selectedNodeId ? replyState.commentId : null;
  const setReplyingTo = (commentId: string | null) => setReplyState({ nodeId: selectedNodeId, commentId });

  if (!node) {
    return (
      <div className="flex h-full w-full flex-col border-l border-[#e5e7eb] bg-[#fafbfc]">
        <div className="flex items-center justify-end border-b border-[#e5e7eb] px-3 py-2">
          <button
            onClick={toggleRightPanel}
            className="rounded-md p-1 text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#6b7280]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#9ca3af]">Select a sequence to inspect</p>
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().replace('T', ' ').slice(0, 16);
  };

  const handleUpdateMeaning = (field: string, value: any) => {
    updateNode(node.id, {
      meaning: {
        ...node.meaning,
        [field]: value
      }
    });
  };

  const handleUpdateHcp = (field: 'min' | 'max', value: string) => {
    updateNode(node.id, {
      meaning: {
        ...node.meaning,
        hcp: {
          ...node.meaning?.hcp,
          [field]: value
        }
      }
    });
  };

  const handleUpdateShape = (field: string, value: any) => {
    updateNode(node.id, {
      meaning: {
        ...node.meaning,
        shape: {
          ...node.meaning?.shape,
          [field]: value
        }
      }
    });
  };

  const normalizedComments = (node.meaning?.comments || []).map((c: any, i: number) => {
    if (typeof c === 'string') return { id: `legacy-${i}`, text: c, author: 'User', timestamp: '' };
    return { ...c, id: c.id || `legacy-${i}` };
  });

  const topLevelComments = normalizedComments.filter((c: any) => !c.parentId);
  const repliesByParent: Record<string, any[]> = {};
  normalizedComments.forEach((c: any) => {
    if (c.parentId) {
      if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = [];
      repliesByParent[c.parentId].push(c);
    }
  });

  const totalComments = normalizedComments.length;
  const unansweredCount = topLevelComments.filter((c: any) => !repliesByParent[c.id] || repliesByParent[c.id].length === 0).length;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto border-l border-[#e5e7eb] bg-white">
      {/* Header — sequence breadcrumb */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#e5e7eb] bg-[#fafbfc] px-3 py-2">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pr-2 font-mono text-xs font-semibold [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {seq.map((step, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1">
              <span className={step.actor === 'opp' ? 'text-[#9ca3af]' : getSuitColor(step.call)}>
                {step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)}
              </span>
              {i < seq.length - 1 && <span className="text-[#d1d5db]">-</span>}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            data-tooltip={node.meaning?.accepted ? "Accepted in System" : "Not Accepted"}
            onClick={() => handleUpdateMeaning('accepted', !node.meaning?.accepted)}
            className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
              node.meaning?.accepted
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                : 'border-[#e5e7eb] bg-[#f9fafb] text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#6b7280]'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
          <label
            data-tooltip="Alert"
            className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border transition ${
              node.meaning?.alert
                ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'border-[#e5e7eb] bg-[#f9fafb] text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#6b7280]'
            }`}
          >
            <input
              type="checkbox"
              checked={!!node.meaning?.alert}
              onChange={(e) => handleUpdateMeaning('alert', e.target.checked)}
              className="sr-only"
            />
            <AlertTriangle className="h-3.5 w-3.5" />
          </label>
          <div className="mx-0.5 h-4 w-px bg-[#e5e7eb]" />
          <button
            onClick={toggleRightPanel}
            className="rounded-md p-1 text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#6b7280]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-[#f0f0f0] p-3">
        {/* HCP & Balanced */}
        <div className="pb-3">
          <div className="flex gap-3">
            <div className="w-24 shrink-0">
              <div className={sectionLabel}>HCP</div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={node.meaning?.hcp?.min || ''}
                  onChange={(e) => handleUpdateHcp('min', e.target.value)}
                  placeholder="Min"
                  className={`${compactInput} text-center`}
                />
                <span className="text-[11px] text-[#9ca3af]">-</span>
                <input
                  type="text"
                  value={node.meaning?.hcp?.max || ''}
                  onChange={(e) => handleUpdateHcp('max', e.target.value)}
                  placeholder="Max"
                  className={`${compactInput} text-center`}
                />
              </div>
            </div>
            <div className="shrink-0">
              <div className={sectionLabel}>Balanced</div>
              <SegmentedToggle
                value={node.meaning?.shape?.balanced === true ? 'true' : node.meaning?.shape?.balanced === false ? 'false' : 'any'}
                onChange={(val) => handleUpdateShape('balanced', val === 'true' ? true : val === 'false' ? false : undefined)}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Type & Forcing */}
        <div className="py-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className={sectionLabel}>Type</div>
              <MiniSelect
                value={node.meaning?.type || 'natural'}
                onChange={(val) => handleUpdateMeaning('type', val)}
                options={[
                  { value: 'ask', label: 'Ask' },
                  { value: 'catch-all', label: 'Catch-all' },
                  { value: 'cuebid', label: 'Cuebid' },
                  { value: 'feature', label: 'Feature' },
                  { value: 'natural', label: 'Natural' },
                  { value: 'opening', label: 'Opening' },
                  { value: 'preempt', label: 'Preempt' },
                  { value: 'relay', label: 'Relay' },
                  { value: 'sign-off', label: 'Sign-off' },
                  { value: 'splinter', label: 'Splinter' },
                  { value: 'transfer', label: 'Transfer' },
                ]}
              />
            </div>
            <div className="flex-1">
              <div className={sectionLabel}>Forcing</div>
              <MiniSelect
                value={node.meaning?.forcing || 'NF'}
                onChange={(val) => handleUpdateMeaning('forcing', val)}
                options={[
                  { value: 'NF', label: 'NF - no forcing' },
                  { value: 'INV', label: 'INV - invite' },
                  { value: 'F1', label: 'F1 - forcing round' },
                  { value: 'FG', label: 'FG - forcing game' },
                  { value: 'SL', label: 'SL - slam try' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Shape */}
        <div className="py-3">
          <div className={sectionLabel}>Shape</div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#2b3446]">♠</span>
              <input type="text" value={node.meaning?.shape?.S || ''} onChange={(e) => handleUpdateShape('S', e.target.value)} className={`${compactInput} pl-4`} />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#9e2d36]">♥</span>
              <input type="text" value={node.meaning?.shape?.H || ''} onChange={(e) => handleUpdateShape('H', e.target.value)} className={`${compactInput} pl-4`} />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#b7692f]">♦</span>
              <input type="text" value={node.meaning?.shape?.D || ''} onChange={(e) => handleUpdateShape('D', e.target.value)} className={`${compactInput} pl-4`} />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#2f6a4a]">♣</span>
              <input type="text" value={node.meaning?.shape?.C || ''} onChange={(e) => handleUpdateShape('C', e.target.value)} className={`${compactInput} pl-4`} />
            </div>
          </div>
          <div className="mt-2">
            <div className="mb-1 text-[10px] italic text-[#9ca3af]">Patterns (comma separated)</div>
            <input
              type="text"
              value={node.meaning?.shape?.patterns?.join(', ') || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleUpdateShape('patterns', val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined);
              }}
              placeholder="4432, 4441"
              className={compactInput}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="py-3">
          <div className={sectionLabel}>Notes</div>
          <textarea
            value={node.meaning?.notes || ''}
            onChange={(e) => handleUpdateMeaning('notes', e.target.value)}
            placeholder="Additional notes..."
            className="h-14 w-full resize-none rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-2 text-[11px] text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
          />
        </div>

        {/* Comments */}
        <div className="pt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className={`${sectionLabel} mb-0`}>Comments</div>
            {totalComments > 0 && (
              <div className="flex gap-1">
                <span className="rounded-full bg-[#f3f4f6] px-1.5 py-0.5 text-[9px] font-medium text-[#6b7280]">
                  {totalComments}
                </span>
                {unansweredCount > 0 && (
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">
                    {unansweredCount} open
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mb-2 space-y-2">
            {topLevelComments.map((comment: any) => (
              <div key={comment.id}>
                <div className="group relative rounded-lg border border-[#e5e7eb] bg-[#fafbfc] p-2 text-xs text-[#374151]">
                  <div className="mb-1 flex items-start justify-between pr-10">
                    <span className="text-[10px] font-semibold text-[#1f2734]">{comment.author || 'User'}</span>
                    <span className="text-[9px] text-[#9ca3af]">{formatTimestamp(comment.timestamp)}</span>
                  </div>
                  <p className="pr-6 leading-snug text-[#6b7280]">{comment.text}</p>
                  <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="rounded p-1 text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#6b7280]"
                      data-tooltip="Reply"
                    >
                      <Reply className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        const newComments = normalizedComments.filter((c: any) => c.id !== comment.id && c.parentId !== comment.id);
                        handleUpdateMeaning('comments', newComments);
                        if (replyingTo === comment.id) setReplyingTo(null);
                      }}
                      className="rounded p-1 text-[#9ca3af] transition hover:bg-red-50 hover:text-red-500"
                      data-tooltip="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {repliesByParent[comment.id] && repliesByParent[comment.id].length > 0 && (
                  <div className="ml-3 mt-1.5 space-y-1.5 border-l-2 border-[#f0f0f0] pl-3">
                    {repliesByParent[comment.id].map((reply: any) => (
                      <div key={reply.id} className="group relative rounded-lg border border-[#f0f0f0] bg-white p-2 text-xs text-[#374151]">
                        <div className="mb-1 flex items-start justify-between pr-6">
                          <span className="text-[10px] font-semibold text-[#1f2734]">{reply.author || 'User'}</span>
                          <span className="text-[9px] text-[#9ca3af]">{formatTimestamp(reply.timestamp)}</span>
                        </div>
                        <p className="pr-6 leading-snug text-[#6b7280]">{reply.text}</p>
                        <button
                          onClick={() => {
                            const newComments = normalizedComments.filter((c: any) => c.id !== reply.id);
                            handleUpdateMeaning('comments', newComments);
                          }}
                          className="absolute right-1.5 top-1.5 rounded p-1 text-[#9ca3af] opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          data-tooltip="Delete reply"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {totalComments === 0 && (
              <p className="text-xs italic text-[#9ca3af]">No comments yet.</p>
            )}
          </div>

          <div className="flex flex-col">
            {replyingTo && (
              <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-[#e5e7eb] bg-[#fafbfc] px-2 py-1 text-[10px] text-[#6b7280]">
                <div className="flex items-center gap-1">
                  <CornerDownRight className="h-3 w-3" />
                  <span>Replying to comment…</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-0.5 text-[#9ca3af] transition hover:text-[#6b7280]">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('comment') as HTMLInputElement;
                if (input.value.trim()) {
                  const newComment = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    text: input.value.trim(),
                    author: 'Me',
                    timestamp: new Date().toISOString(),
                    ...(replyingTo ? { parentId: replyingTo } : {})
                  };
                  handleUpdateMeaning('comments', [...normalizedComments, newComment]);
                  input.value = '';
                  setReplyingTo(null);
                }
              }}
              className={`flex gap-1.5 ${replyingTo ? 'rounded-b-lg border border-t-0 border-[#e5e7eb] bg-[#fafbfc] p-1.5 pt-1' : ''}`}
            >
              <input
                name="comment"
                type="text"
                placeholder={replyingTo ? "Write a reply…" : "Add a comment…"}
                className={`flex-1 ${compactInput} ${replyingTo ? 'rounded-md' : ''}`}
              />
              <button
                type="submit"
                className={`h-7 rounded-md bg-[#1f2734] px-3 text-[11px] font-medium text-white transition hover:bg-[#374151]`}
              >
                {replyingTo ? 'Reply' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
