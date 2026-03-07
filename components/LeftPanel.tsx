import { useMemo, useState, type ReactNode } from 'react';
import {
  useBiddingStore,
  type CustomSmartViewField,
  type SectionMutationResult,
  type SmartViewMutationResult,
  type SectionTreeNode,
} from '@/store/useBiddingStore';
import { formatCall, getSuitColor } from '@/lib/utils';
import {
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
    selectedNodeId,
    leftPrimaryMode,
    activeSectionId,
    activeSmartViewId,
    sectionExpandedById,
    createSection,
    renameSection,
    deleteSection,
    createCustomSmartView,
    updateCustomSmartView,
    deleteCustomSmartView,
    toggleSmartViewPinned,
    setLeftPrimaryMode,
    setActiveSectionId,
    setActiveSmartViewId,
    toggleSectionExpanded,
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

  const roots = useMemo(() => Object.values(nodes).filter((n) => n.context.sequence.length === 1), [nodes]);
  const bookmarks = useMemo(() => Object.values(nodes).filter((n) => n.isBookmarked), [nodes]);
  const sectionTree = getSectionTree();
  const smartViews = getSmartViews();

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

  const renderSectionRows = (items: SectionTreeNode[], depth = 0): ReactNode => {
    return items.map((item) => {
      const section = item.section;
      const children = item.children;
      const hasChildren = children.length > 0;
      const isExpanded = sectionExpandedById[section.id] ?? true;
      const isActive = leftPrimaryMode === 'sections' && activeSectionId === section.id;
      const nodeCount = getSectionNodeCount(section.id);

      return (
        <li key={section.id} className="relative">
          <div className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setLeftPrimaryMode('sections');
                setActiveSectionId(section.id);
                setActiveSmartViewId(null);
              }}
              className={`flex-1 min-w-0 text-left rounded-md text-sm transition-colors ${
                isActive ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-200 text-slate-700'
              }`}
              style={{ padding: `6px 8px 6px ${8 + depth * 14}px` }}
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
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Section actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {actionMenuSectionId === section.id && (
            <div className="absolute right-1 top-8 z-30 w-44 rounded-md border border-slate-200 bg-white shadow-lg py-1">
              <button
                type="button"
                onClick={() => {
                  setLeftPrimaryMode('sections');
                  setActiveSectionId(section.id);
                  setActiveSmartViewId(null);
                  setActionMenuSectionId(null);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
              >
                Open
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
            <ul className="space-y-1 mt-0.5">{renderSectionRows(children, depth + 1)}</ul>
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
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                aria-label="Smart view actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {actionMenuSmartViewId === smartView.id && !smartView.isBuiltIn && (
            <div className="absolute right-1 top-8 z-30 w-44 rounded-md border border-slate-200 bg-white shadow-lg py-1">
              <button
                type="button"
                onClick={() => {
                  setLeftPrimaryMode('smartViews');
                  setActiveSmartViewId(smartView.id);
                  setActiveSectionId(null);
                  setActionMenuSmartViewId(null);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
              >
                Open
              </button>
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
    <div className="h-full w-full border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto relative">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FolderTree className="w-3.5 h-3.5" />
          Roots
        </h3>
        <ul className="space-y-1">
          {roots.map((root) => (
            <li key={root.id}>
              <button
                onClick={() => {
                  setLeftPrimaryMode('roots');
                  setActiveSectionId(null);
                  setActiveSmartViewId(null);
                  selectNode(root.id);
                }}
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

      <div className="px-4 py-3 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <FolderPlus className="w-3.5 h-3.5" />
            Sections
          </h3>
          <button
            type="button"
            onClick={() => openCreateModal(null)}
            className="p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Create section"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

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
            {bookmarks.map((bm) => (
              <li key={bm.id}>
                <button
                  onClick={() => {
                    setLeftPrimaryMode('roots');
                    setActiveSectionId(null);
                    setActiveSmartViewId(null);
                    selectNode(bm.id);
                  }}
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Smart Views
          </h3>
          <button
            type="button"
            onClick={openCreateSmartViewModal}
            className="p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Create custom smart view"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <ul className="space-y-1">
          {renderSmartViewRows()}
        </ul>
      </div>

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
