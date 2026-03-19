'use client';

import { trpc } from '@/lib/trpc/react';
import {
  collectSystemsHubTags,
  type SystemsHubAccessFilter,
  type SystemsHubStatusFilter,
} from '@/lib/systems-hub';
import {
  listSystemTemplateProfiles,
  type SystemTemplateId,
} from '@/lib/system-templates';
import { useBiddingStore } from '@/store/useBiddingStore';
import {
  Check,
  ChevronDown,
  CircleAlert,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_SYSTEM_TITLE = 'Untitled system';
type CreateTemplateOption = 'blank' | SystemTemplateId;

/* ── Custom tooltip (CSS-only, no native title) ── */
function Tooltip({ label, children, side = 'top' }: { label: string; children: React.ReactNode; side?: 'top' | 'bottom' }) {
  return (
    <span className="group/ttip relative inline-flex">
      {children}
      <span
        className={`pointer-events-none invisible absolute left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1f2734] px-2 py-1 text-[10px] font-medium text-white shadow-lg transition-all group-hover/ttip:visible group-hover/ttip:opacity-100 ${
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        }`}
        style={{ opacity: 0 }}
      >
        {label}
      </span>
    </span>
  );
}

/* ── Compact custom select (no native dropdown) ── */
function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeLabel = options.find((o) => o.value === value)?.label ?? '';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`inline-flex h-8 w-full items-center justify-between gap-1 rounded-lg border px-2.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20 ${
          open
            ? 'border-[#6b7280] bg-white text-[#1f2734]'
            : 'border-[#e5e7eb] bg-white text-[#1f2734] hover:border-[#d1d5db]'
        }`}
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown className={`size-3 shrink-0 text-[#9ca3af] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[80] mt-1 max-h-48 min-w-full overflow-auto rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition ${
                value === opt.value
                  ? 'bg-[#f3f4f6] font-medium text-[#1f2734]'
                  : 'text-[#374151] hover:bg-[#fafbfc]'
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="size-3 text-[#1f2734]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown update time';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleLabel(role: 'owner' | 'editor' | 'reviewer' | 'viewer'): string {
  if (role === 'owner') return 'Owner';
  if (role === 'editor') return 'Editor';
  if (role === 'reviewer') return 'Reviewer';
  return 'Viewer';
}

export function SystemsHubMenu() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [access, setAccess] = useState<SystemsHubAccessFilter>('all');
  const [statusFilter, setStatusFilter] = useState<SystemsHubStatusFilter>('all');
  const [tag, setTag] = useState<string>('');
  const [createTemplate, setCreateTemplate] = useState<CreateTemplateOption>('blank');
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');

  /* ── inline edit state ── */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameDescription, setRenameDescription] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const activeSystemId = useBiddingStore((state) => state.activeSystemId);
  const hasUnsavedChanges = useBiddingStore((state) => state.hasUnsavedChanges);
  const isServerSyncing = useBiddingStore((state) => state.isServerSyncing);
  const setActiveSystem = useBiddingStore((state) => state.setActiveSystem);
  const markServerSyncError = useBiddingStore((state) => state.markServerSyncError);

  const listInput = useMemo(() => ({
    query: query.trim() ? query.trim() : undefined,
    access,
    status: statusFilter,
    tag: tag || undefined,
  }), [access, query, statusFilter, tag]);

  const systemsQuery = trpc.bidding.systems.list.useQuery(listInput, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    staleTime: 20_000,
  });
  const utils = trpc.useUtils();

  const createSystemMutation = trpc.bidding.systems.create.useMutation({
    onSuccess: ({ system }) => {
      setActiveSystem(system.id, system.revision);
      setIsOpen(false);
      setIsCreateFormOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      void utils.bidding.systems.list.invalidate();
      void utils.bidding.systems.get.invalidate({ systemId: system.id });
    },
    onError: () => {
      markServerSyncError('Failed to create system');
    },
  });

  const updateSystemMutation = trpc.bidding.systems.update.useMutation({
    onSuccess: () => {
      void utils.bidding.systems.list.invalidate();
      setRenamingId(null);
    },
    onError: () => {
      markServerSyncError('Failed to rename system');
    },
  });

  const deleteSystemMutation = trpc.bidding.systems.delete.useMutation({
    onSuccess: (_data, variables) => {
      if (activeSystemId === variables.systemId) {
        setActiveSystem(null);
      }
      void utils.bidding.systems.list.invalidate();
      setDeleteConfirmId(null);
    },
    onError: () => {
      markServerSyncError('Failed to delete system');
      setDeleteConfirmId(null);
    },
  });

  const systems = useMemo(() => systemsQuery.data?.systems ?? [], [systemsQuery.data?.systems]);
  const templateProfiles = useMemo(() => listSystemTemplateProfiles(), []);
  const templateSelectOptions = useMemo(() => [
    { value: 'blank' as CreateTemplateOption, label: 'Blank' },
    ...templateProfiles.map((p) => ({ value: p.id as CreateTemplateOption, label: p.name })),
  ], [templateProfiles]);
  const accessOptions = useMemo(() => [
    { value: 'all' as SystemsHubAccessFilter, label: 'Access: All' },
    { value: 'owner' as SystemsHubAccessFilter, label: 'Access: Owned' },
    { value: 'shared' as SystemsHubAccessFilter, label: 'Access: Shared' },
  ], []);
  const statusOptions = useMemo(() => [
    { value: 'all' as SystemsHubStatusFilter, label: 'Status: All' },
    { value: 'active' as SystemsHubStatusFilter, label: 'Status: Active' },
    { value: 'stale' as SystemsHubStatusFilter, label: 'Status: Stale' },
  ], []);
  const selectedTemplateProfile = useMemo(
    () => templateProfiles.find((item) => item.id === createTemplate) ?? null,
    [createTemplate, templateProfiles],
  );
  const availableTags = useMemo(() => collectSystemsHubTags(systems), [systems]);
  const selectedSystem = systems.find((system) => system.id === activeSystemId) ?? null;
  const roleCounts = useMemo(() => (
    systems.reduce(
      (acc, system) => {
        acc[system.role] += 1;
        return acc;
      },
      { owner: 0, editor: 0, reviewer: 0, viewer: 0 },
    )
  ), [systems]);

  const switchBlocked = hasUnsavedChanges || isServerSyncing;
  const blockMessage = isServerSyncing
    ? 'Switch disabled while syncing.'
    : hasUnsavedChanges
      ? 'Switch disabled until unsaved changes are synced.'
      : '';

  const handleSelectSystem = (systemId: string, revision: number) => {
    if (switchBlocked) return;
    setActiveSystem(systemId, revision);
    setIsOpen(false);
  };

  const handleCreateSystem = () => {
    const titleValue = createTitle.trim() || (selectedTemplateProfile?.defaultTitle ?? DEFAULT_SYSTEM_TITLE);
    const descValue = createDescription.trim() || (selectedTemplateProfile?.defaultDescription ?? undefined);
    const payload = selectedTemplateProfile
      ? {
        title: titleValue,
        description: descValue,
        templateId: selectedTemplateProfile.id,
      }
      : {
        title: titleValue,
        description: descValue,
      };
    createSystemMutation.mutate(payload);
  };

  /* ── rename handlers ── */
  const startRename = useCallback((systemId: string, currentTitle: string, currentDescription: string | null) => {
    setRenamingId(systemId);
    setRenameValue(currentTitle);
    setRenameDescription(currentDescription ?? '');
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, []);

  const commitRename = useCallback(() => {
    if (!renamingId) return;
    const trimmedTitle = renameValue.trim();
    const trimmedDesc = renameDescription.trim();
    if (!trimmedTitle || trimmedTitle.length > 120) {
      setRenamingId(null);
      return;
    }
    updateSystemMutation.mutate({
      systemId: renamingId,
      data: { title: trimmedTitle, description: trimmedDesc || null },
    });
  }, [renamingId, renameValue, renameDescription, updateSystemMutation]);

  /* ── delete handler ── */
  const handleDelete = useCallback((systemId: string) => {
    deleteSystemMutation.mutate({ systemId });
  }, [deleteSystemMutation]);

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
      setDeleteConfirmId(null);
      setRenamingId(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);


  if (!isAuthenticated) return null;

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <Tooltip label="Systems hub">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className={`h-8 px-3 text-sm font-medium rounded-md flex items-center gap-2 transition-colors border ${
            isOpen
              ? 'bg-[#1f2734]/5 text-[#1f2734] border-[#1f2734]/20'
              : 'bg-white text-[#374151] border-[#e5e7eb] hover:bg-[#f3f4f6]'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span className="hidden md:inline">Systems</span>
        </button>
      </Tooltip>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-[65] w-[420px] max-w-[90vw] rounded-xl border border-[#e5e7eb] bg-white shadow-xl">
          {/* ── Header ── */}
          <div className="px-3 py-3 border-b border-[#f0f0f0] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Systems Hub</div>
                <div className="text-xs text-[#6b7280]">
                  {selectedSystem ? `${selectedSystem.title} (${roleLabel(selectedSystem.role)})` : 'No active system'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateFormOpen((v) => !v)}
                className={`h-8 px-2.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors ${
                  isCreateFormOpen
                    ? 'bg-[#374151] text-white'
                    : 'bg-[#1f2734] text-white hover:bg-[#374151]'
                }`}
              >
                <Plus className={`w-3.5 h-3.5 transition-transform ${isCreateFormOpen ? 'rotate-45' : ''}`} />
                New
              </button>
            </div>

            {/* ── Create form ── */}
            {isCreateFormOpen && (
              <div className="space-y-2 rounded-lg border border-dashed border-[#d1d5db] bg-[#fafbfc] p-2.5">
                <input
                  type="text"
                  placeholder="System name"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#e5e7eb] bg-white px-2.5 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#e5e7eb] bg-white px-2.5 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                />
                <div className="flex items-center gap-2">
                  <MiniSelect
                    value={createTemplate}
                    onChange={(v) => setCreateTemplate(v as CreateTemplateOption)}
                    options={templateSelectOptions}
                    className="min-w-[80px] flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleCreateSystem}
                    disabled={createSystemMutation.isPending}
                    className="h-8 px-3 text-xs font-medium rounded-md bg-[#1f2734] text-white hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition-colors"
                  >
                    {createSystemMutation.isPending ? 'Creating…' : 'Create'}
                  </button>
                </div>
                {selectedTemplateProfile && (
                  <div className="text-[10px] text-[#6b7280]">
                    {selectedTemplateProfile.name}: {selectedTemplateProfile.description}
                  </div>
                )}
              </div>
            )}

            <input
              type="text"
              placeholder="Search systems..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-8 w-full rounded-md border border-[#e5e7eb] bg-white px-2.5 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />

            <div className="grid grid-cols-2 gap-2">
              <MiniSelect
                value={access}
                onChange={(v) => setAccess(v as SystemsHubAccessFilter)}
                options={accessOptions}
              />
              <MiniSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as SystemsHubStatusFilter)}
                options={statusOptions}
              />
            </div>

            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTag('')}
                  className={`h-6 px-2 text-[11px] rounded-full border ${
                    tag === ''
                      ? 'border-[#1f2734]/20 bg-[#1f2734]/5 text-[#1f2734]'
                      : 'border-[#e5e7eb] bg-[#fafbfc] text-[#6b7280] hover:bg-[#f3f4f6]'
                  }`}
                >
                  all tags
                </button>
                {availableTags.slice(0, 8).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setTag((current) => (current === item ? '' : item))}
                    className={`h-6 px-2 text-[11px] rounded-full border ${
                      tag === item
                        ? 'border-[#1f2734]/20 bg-[#1f2734]/5 text-[#1f2734]'
                        : 'border-[#e5e7eb] bg-[#fafbfc] text-[#6b7280] hover:bg-[#f3f4f6]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            <div className="text-[11px] text-[#6b7280]">
              Owner {roleCounts.owner} | Editor {roleCounts.editor} | Reviewer {roleCounts.reviewer} | Viewer {roleCounts.viewer}
            </div>
          </div>

          {/* ── System list ── */}
          <div>
            {systemsQuery.isLoading ? (
              <div className="px-3 py-4 text-sm text-[#6b7280]">Loading systems...</div>
            ) : systems.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[#6b7280]">
                No systems for selected filters.
              </div>
            ) : (
              systems.map((system) => {
                const isActive = system.id === activeSystemId;
                const isRenaming = renamingId === system.id;
                const isDeleteConfirm = deleteConfirmId === system.id;
                const canManage = system.role === 'owner' || system.role === 'editor';
                const canDelete = system.role === 'owner';

                return (
                  <div
                    key={system.id}
                    className={`group/row relative w-full text-left px-3 py-2.5 border-b last:border-b-0 border-[#f0f0f0] transition-colors ${
                      isActive ? 'bg-[#1f2734]/5' : 'hover:bg-[#fafbfc]'
                    } ${switchBlocked ? 'opacity-70' : ''}`}
                  >
                    {/* Delete confirmation overlay */}
                    {isDeleteConfirm ? (
                      <div
                        className="space-y-2 py-1"
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <div className="text-[11px] text-red-600 font-medium">
                          Delete &quot;{system.title}&quot;?
                        </div>
                        <div className="text-[10px] text-[#6b7280]">
                          All data, nodes, versions, and shares will be permanently removed.
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDelete(system.id)}
                            disabled={deleteSystemMutation.isPending}
                            className="h-6 px-2.5 text-[11px] font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {deleteSystemMutation.isPending ? 'Deleting…' : 'Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="h-6 px-2.5 text-[11px] font-medium rounded-md border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Main row — clickable area */}
                        <button
                          type="button"
                          onClick={() => handleSelectSystem(system.id, system.revision)}
                          disabled={switchBlocked}
                          className={`w-full text-left ${switchBlocked ? 'cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              {isRenaming ? (
                                <div
                                  className="space-y-1.5"
                                  onClick={(event) => event.stopPropagation()}
                                  onPointerDown={(event) => event.stopPropagation()}
                                >
                                  <input
                                    ref={renameInputRef}
                                    type="text"
                                    value={renameValue}
                                    onChange={(event) => setRenameValue(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') commitRename();
                                      if (event.key === 'Escape') setRenamingId(null);
                                    }}
                                    placeholder="System name"
                                    className="h-7 w-full rounded-md border border-[#6b7280] bg-white px-2 text-sm text-[#1f2734] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                                    autoFocus
                                  />
                                  <input
                                    type="text"
                                    value={renameDescription}
                                    onChange={(event) => setRenameDescription(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') commitRename();
                                      if (event.key === 'Escape') setRenamingId(null);
                                    }}
                                    onBlur={commitRename}
                                    placeholder="Description (optional)"
                                    className="h-7 w-full rounded-md border border-[#e5e7eb] bg-white px-2 text-[11px] text-[#1f2734] placeholder:text-[#9ca3af] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="text-sm font-medium text-[#1f2734] truncate pr-14">{system.title}</div>
                                  <div className="text-[11px] text-[#6b7280] truncate">
                                    {system.description || 'No description'}
                                  </div>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f3f4f6] text-[#6b7280] shrink-0">
                              {roleLabel(system.role)}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-[#6b7280]">
                            rev {system.revision} | updated {formatUpdatedAt(system.updatedAt)}
                          </div>
                        </button>

                        {/* Inline action icons — bottom-right, visible on hover */}
                        {canManage && !isRenaming && (
                          <div className="absolute right-2 bottom-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                            <Tooltip label="Edit" side="bottom">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startRename(system.id, system.title, system.description);
                                }}
                                className="rounded-md p-1 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#6b7280]"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                            {canDelete && (
                              <Tooltip label="Delete" side="bottom">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeleteConfirmId(system.id);
                                  }}
                                  className="rounded-md p-1 text-[#9ca3af] transition-colors hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {switchBlocked && (
            <div className="px-3 py-2 text-[11px] text-amber-700 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5">
              <CircleAlert className="w-3.5 h-3.5" />
              {blockMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
