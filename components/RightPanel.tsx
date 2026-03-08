import { useBiddingStore } from '@/store/useBiddingStore';
import { formatCall, getSuitColor } from '@/lib/utils';
import { X, CheckCircle2, Trash2, AlertTriangle, Reply, CornerDownRight } from 'lucide-react';
import { useState } from 'react';

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
      <div className="h-full w-full border-l border-[#DBEAFE] bg-slate-50 flex items-center justify-center relative">
        <button 
          onClick={toggleRightPanel}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="text-sm text-slate-400">Select a sequence to inspect</div>
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
    <div className="h-full w-full border-l border-[#DBEAFE] bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
        <div className="flex items-center gap-1 font-mono text-xs font-semibold overflow-x-auto whitespace-nowrap pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {seq.map((step, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <span className={step.actor === 'opp' ? 'text-slate-500' : getSuitColor(step.call)}>
                {step.actor === 'opp' ? `(${formatCall(step.call)})` : formatCall(step.call)}
              </span>
              {i < seq.length - 1 && <span className="text-slate-400">-</span>}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            title={node.meaning?.accepted ? "Accepted in System" : "Not Accepted"}
            onClick={() => handleUpdateMeaning('accepted', !node.meaning?.accepted)}
            className={`h-6 w-6 flex items-center justify-center border rounded-md transition-colors ${
              node.meaning?.accepted 
                ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                : 'text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <label 
            title="Alert"
            className={`h-6 w-6 flex items-center justify-center border rounded-md cursor-pointer transition-colors ${
              node.meaning?.alert
                ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <input 
              type="checkbox" 
              checked={!!node.meaning?.alert}
              onChange={(e) => handleUpdateMeaning('alert', e.target.checked)}
              className="sr-only"
            />
            <AlertTriangle className="w-3.5 h-3.5" />
          </label>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button 
            onClick={toggleRightPanel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Row 1: HCP & Balanced */}
        <div className="flex gap-2">
          <div className="w-24 shrink-0">
            <div className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wider">HCP</div>
            <div className="flex items-center gap-1">
              <input 
                type="text" 
                value={node.meaning?.hcp?.min || ''}
                onChange={(e) => handleUpdateHcp('min', e.target.value)}
                placeholder="Min"
                className="w-full h-6 px-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
              <span className="text-slate-400 text-[11px]">-</span>
              <input 
                type="text" 
                value={node.meaning?.hcp?.max || ''}
                onChange={(e) => handleUpdateHcp('max', e.target.value)}
                placeholder="Max"
                className="w-full h-6 px-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
            </div>
          </div>
          <div className="w-24 shrink-0">
            <div className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wider">Balanced</div>
            <select 
              value={node.meaning?.shape?.balanced === true ? 'true' : node.meaning?.shape?.balanced === false ? 'false' : ''}
              onChange={(e) => {
                const val = e.target.value;
                handleUpdateShape('balanced', val === 'true' ? true : val === 'false' ? false : undefined);
              }}
              className="w-full h-6 px-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>

        {/* Row 2: Type & Forcing */}
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wider">Type</div>
            <select 
              value={node.meaning?.type || 'natural'}
              onChange={(e) => handleUpdateMeaning('type', e.target.value)}
              className="w-full h-6 px-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ask">Ask</option>
              <option value="catch-all">Catch-all</option>
              <option value="cuebid">Cuebid</option>
              <option value="feature">Feature</option>
              <option value="natural">Natural</option>
              <option value="preempt">Preempt</option>
              <option value="relay">Relay</option>
              <option value="sign-off">Sign-off</option>
              <option value="splinter">Splinter</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wider">Forcing</div>
            <select 
              value={node.meaning?.forcing || 'NF'}
              onChange={(e) => handleUpdateMeaning('forcing', e.target.value)}
              className="w-full h-6 px-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NF">NF - no forcing</option>
              <option value="INV">INV - invite</option>
              <option value="F1">F1 - forcing round</option>
              <option value="FG">FG - forcing game</option>
              <option value="SL">SL - slam try</option>
            </select>
          </div>
        </div>

        {/* Row 3: Shape & Patterns */}
        <div>
          <div className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wider">Shape</div>
          <div className="flex items-center gap-1">
            <div className="flex-1 relative">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-900">♠</span>
              <input type="text" value={node.meaning?.shape?.S || ''} onChange={(e) => handleUpdateShape('S', e.target.value)} className="w-full h-6 pl-4 pr-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-red-600">♥</span>
              <input type="text" value={node.meaning?.shape?.H || ''} onChange={(e) => handleUpdateShape('H', e.target.value)} className="w-full h-6 pl-4 pr-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-orange-500">♦</span>
              <input type="text" value={node.meaning?.shape?.D || ''} onChange={(e) => handleUpdateShape('D', e.target.value)} className="w-full h-6 pl-4 pr-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-900">♣</span>
              <input type="text" value={node.meaning?.shape?.C || ''} onChange={(e) => handleUpdateShape('C', e.target.value)} className="w-full h-6 pl-4 pr-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div>
          <div className="text-[9px] text-slate-500 mb-1 italic">Patterns (comma separated)</div>
          <input 
            type="text" 
            value={node.meaning?.shape?.patterns?.join(', ') || ''}
            onChange={(e) => {
              const val = e.target.value;
              handleUpdateShape('patterns', val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined);
            }}
            placeholder="4432, 4441"
            className="w-full h-6 px-2 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <div className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wider">Notes</div>
          <textarea 
            value={node.meaning?.notes || ''}
            onChange={(e) => handleUpdateMeaning('notes', e.target.value)}
            placeholder="Additional notes..."
            className="w-full h-12 p-2 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>


        {/* Comments */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Comments</div>
            {totalComments > 0 && (
              <div className="flex gap-1">
                <div className="bg-slate-100 text-slate-600 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm" title="Total comments">
                  {totalComments} total
                </div>
                {unansweredCount > 0 && (
                  <div className="bg-orange-100 text-orange-600 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm" title="Unanswered top-level comments">
                    {unansweredCount} unanswered
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-2 mb-2">
            {topLevelComments.map((comment: any) => (
              <div key={comment.id} className="mb-2">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-2 text-xs text-slate-700 relative group">
                  <div className="flex justify-between items-start mb-1 pr-12">
                    <span className="font-semibold text-slate-900 text-[10px]">{comment.author || 'User'}</span>
                    <span className="text-slate-400 text-[9px]">{formatTimestamp(comment.timestamp)}</span>
                  </div>
                  <p className="pr-6 text-slate-600 leading-snug">{comment.text}</p>
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setReplyingTo(comment.id)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                      title="Reply"
                    >
                      <Reply className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => {
                        const newComments = normalizedComments.filter((c: any) => c.id !== comment.id && c.parentId !== comment.id);
                        handleUpdateMeaning('comments', newComments);
                        if (replyingTo === comment.id) setReplyingTo(null);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {/* Replies */}
                {repliesByParent[comment.id] && repliesByParent[comment.id].length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {repliesByParent[comment.id].map((reply: any) => (
                      <div key={reply.id} className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-px bg-slate-200"></div>
                        <div className="absolute -left-3 top-3 w-3 h-px bg-slate-200"></div>
                        <div className="bg-white border border-slate-100 rounded-md p-2 text-xs text-slate-700 relative group shadow-sm">
                          <div className="flex justify-between items-start mb-1 pr-6">
                            <span className="font-semibold text-slate-900 text-[10px]">{reply.author || 'User'}</span>
                            <span className="text-slate-400 text-[9px]">{formatTimestamp(reply.timestamp)}</span>
                          </div>
                          <p className="pr-6 text-slate-600 leading-snug">{reply.text}</p>
                          <button 
                            onClick={() => {
                              const newComments = normalizedComments.filter((c: any) => c.id !== reply.id);
                              handleUpdateMeaning('comments', newComments);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                            title="Delete reply"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {totalComments === 0 && (
              <div className="text-xs text-slate-400 italic">No comments yet.</div>
            )}
          </div>

          <div className="flex flex-col">
            {replyingTo && (
              <div className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded-t-md border border-blue-100 border-b-0 text-[10px] text-blue-700">
                <div className="flex items-center gap-1">
                  <CornerDownRight className="w-3 h-3" />
                  <span>Replying to comment...</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="hover:text-blue-900 p-0.5">
                  <X className="w-3 h-3" />
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
              className={`flex gap-2 ${replyingTo ? 'bg-blue-50 p-1.5 pt-0 rounded-b-md border border-blue-100 border-t-0' : ''}`}
            >
              <input 
                name="comment"
                type="text" 
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                className={`flex-1 h-6 px-2 text-[11px] bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${replyingTo ? 'rounded-sm' : 'rounded-md'}`}
              />
              <button 
                type="submit"
                className={`h-6 px-3 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors ${replyingTo ? 'rounded-sm' : 'rounded-md'}`}
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
