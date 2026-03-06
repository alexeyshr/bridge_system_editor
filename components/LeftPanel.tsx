import { useBiddingStore } from '@/store/useBiddingStore';
import { formatCall, getSuitColor } from '@/lib/utils';
import { Bookmark, FolderTree, Eye } from 'lucide-react';

export function LeftPanel() {
  const { nodes, selectNode, selectedNodeId } = useBiddingStore();

  const roots = Object.values(nodes).filter(n => n.context.sequence.length === 1);
  const bookmarks = Object.values(nodes).filter(n => n.isBookmarked);

  return (
    <div className="h-full w-full border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FolderTree className="w-3.5 h-3.5" />
          Roots
        </h3>
        <ul className="space-y-1">
          {roots.map(root => (
            <li key={root.id}>
              <button
                onClick={() => selectNode(root.id)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedNodeId === root.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className={getSuitColor(root.context.sequence[0])}>
                  {formatCall(root.context.sequence[0])}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-2 border-t border-slate-200">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bookmark className="w-3.5 h-3.5" />
          Bookmarks
        </h3>
        {bookmarks.length === 0 ? (
          <div className="text-xs text-slate-400 italic px-2">No bookmarks</div>
        ) : (
          <ul className="space-y-1">
            {bookmarks.map(bm => (
              <li key={bm.id}>
                <button
                  onClick={() => selectNode(bm.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm font-medium transition-colors truncate ${
                    selectedNodeId === bm.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {bm.context.sequence.map((c, i) => (
                    <span key={i} className="inline-flex items-center">
                      <span className={getSuitColor(c)}>{formatCall(c)}</span>
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
      </div>

      <div className="px-4 py-4 border-t border-slate-200 mt-auto">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" />
          Saved Views
        </h3>
        <div className="text-xs text-slate-400 italic px-2">Coming soon</div>
      </div>
    </div>
  );
}
