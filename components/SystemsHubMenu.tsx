'use client';

import { trpc } from '@/lib/trpc/react';
import {
  collectSystemsHubTags,
  getSystemStatus,
  type SystemsHubAccessFilter,
  type SystemsHubStatusFilter,
} from '@/lib/systems-hub';
import { useBiddingStore } from '@/store/useBiddingStore';
import { CheckCircle2, CircleAlert, FolderOpen, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_SYSTEM_TITLE = 'Untitled system';

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

function roleLabel(role: 'owner' | 'editor' | 'viewer'): string {
  if (role === 'owner') return 'Owner';
  if (role === 'editor') return 'Editor';
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
      void utils.bidding.systems.list.invalidate();
      void utils.bidding.systems.get.invalidate({ systemId: system.id });
    },
    onError: () => {
      markServerSyncError('Failed to create system');
    },
  });

  const systems = useMemo(() => systemsQuery.data?.systems ?? [], [systemsQuery.data?.systems]);
  const availableTags = useMemo(() => collectSystemsHubTags(systems), [systems]);
  const selectedSystem = systems.find((system) => system.id === activeSystemId) ?? null;
  const roleCounts = useMemo(() => (
    systems.reduce(
      (acc, system) => {
        acc[system.role] += 1;
        return acc;
      },
      { owner: 0, editor: 0, viewer: 0 },
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

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  if (!isAuthenticated) return null;

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`h-8 px-3 text-sm font-medium rounded-md flex items-center gap-2 transition-colors border ${
          isOpen
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
        }`}
        title="Systems hub"
      >
        <FolderOpen className="w-4 h-4" />
        <span className="hidden md:inline">Systems</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-[65] w-[420px] max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-3 py-3 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Systems Hub</div>
                <div className="text-xs text-slate-500">
                  {selectedSystem ? `${selectedSystem.title} (${roleLabel(selectedSystem.role)})` : 'No active system'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => createSystemMutation.mutate({ title: DEFAULT_SYSTEM_TITLE })}
                disabled={createSystemMutation.isPending}
                className="h-8 px-2.5 text-xs font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                title="Create new system"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>

            <input
              type="text"
              placeholder="Search systems..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={access}
                onChange={(event) => setAccess(event.target.value as SystemsHubAccessFilter)}
                className="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Access: All</option>
                <option value="owner">Access: Owned</option>
                <option value="shared">Access: Shared</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as SystemsHubStatusFilter)}
                className="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Status: All</option>
                <option value="active">Status: Active</option>
                <option value="stale">Status: Stale</option>
              </select>
            </div>

            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTag('')}
                  className={`h-6 px-2 text-[11px] rounded-full border ${
                    tag === ''
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
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
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            <div className="text-[11px] text-slate-500">
              Owner {roleCounts.owner} | Editor {roleCounts.editor} | Viewer {roleCounts.viewer}
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {systemsQuery.isLoading ? (
              <div className="px-3 py-4 text-sm text-slate-500">Loading systems...</div>
            ) : systems.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500">
                No systems for selected filters.
              </div>
            ) : (
              systems.map((system) => {
                const systemStatus = getSystemStatus(system.updatedAt);
                const isActive = system.id === activeSystemId;
                return (
                  <button
                    key={system.id}
                    type="button"
                    onClick={() => handleSelectSystem(system.id, system.revision)}
                    disabled={switchBlocked}
                    className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 border-slate-100 transition-colors ${
                      isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                    } ${switchBlocked ? 'cursor-not-allowed opacity-70' : ''}`}
                    title={switchBlocked ? blockMessage : 'Open in editor'}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{system.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {system.description || 'No description'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {roleLabel(system.role)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                            systemStatus === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {systemStatus}
                        </span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      rev {system.revision} | schema v{system.schemaVersion} | updated {formatUpdatedAt(system.updatedAt)}
                    </div>
                  </button>
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
