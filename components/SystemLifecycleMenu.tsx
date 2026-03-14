'use client';

import { trpc } from '@/lib/trpc/react';
import { useBiddingStore } from '@/store/useBiddingStore';
import {
  ArrowUpRight,
  GitCompareArrows,
  History,
  MousePointer2,
  Rocket,
  Snowflake,
  Trash2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function formatPublishedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatScope(scopeType: 'global' | 'pair' | 'team', scopeId: string): string {
  if (scopeType === 'global') return 'Global';
  if (!scopeId) return scopeType === 'pair' ? 'Pair' : 'Team';
  return `${scopeType === 'pair' ? 'Pair' : 'Team'}:${scopeId}`;
}

type TimelineCategoryFilter =
  | 'all'
  | 'node'
  | 'lifecycle'
  | 'binding'
  | 'sharing'
  | 'discussion'
  | 'link'
  | 'system'
  | 'other';

type TimelineEvent = {
  id: string;
  action: string;
  category: Exclude<TimelineCategoryFilter, 'all'>;
  targetType: string;
  targetId: string | null;
  payload: unknown;
  createdAt: string;
  actor: {
    id: string | null;
    displayName: string | null;
    email: string | null;
    telegramUsername: string | null;
    label: string;
    profileHref: string | null;
  };
};

type TimelineCursor = {
  createdAt: string;
  id: string;
};

type TimelinePageInfo = {
  limit: number;
  windowDays: number;
  hasMore: boolean;
  nextCursor: TimelineCursor | null;
};

const TIMELINE_PAGE_LIMIT = 30;
const TIMELINE_WINDOW_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
];

function formatTimelineTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimelineActor(event: TimelineEvent): string {
  if (event.actor.label?.trim()) return event.actor.label.trim();
  if (event.actor.displayName?.trim()) return event.actor.displayName.trim();
  if (event.actor.email?.trim()) return event.actor.email.trim();
  if (event.actor.telegramUsername?.trim()) return `@${event.actor.telegramUsername.trim()}`;
  if (event.actor.id) return `User ${event.actor.id.slice(0, 8)}`;
  if (event.action === 'read_only_link.access') return 'Link visitor';
  return 'System';
}

function getTimelineActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'system.create': 'System created',
    'system.update': 'System metadata updated',
    'system.move_space': 'System moved to another space',
    'node.sync': 'Nodes synced',
    'lifecycle.publish': 'Version published',
    'lifecycle.draft_from_version': 'Draft restored from version',
    'binding.upsert': 'Tournament binding updated',
    'binding.freeze': 'Tournament binding frozen',
    'binding.remove': 'Tournament binding removed',
    'binding.freeze_tournament': 'All tournament bindings frozen',
    'invite.create': 'Invite created',
    'invite.accept': 'Invite accepted',
    'invite.revoke': 'Invite revoked',
    'discussion.thread.create': 'Discussion thread created',
    'discussion.message.create': 'Discussion message posted',
    'read_only_link.create': 'Read-only link created',
    'read_only_link.rotate': 'Read-only link rotated',
    'read_only_link.revoke': 'Read-only link revoked',
    'read_only_link.access': 'Read-only link accessed',
  };
  return labels[action] ?? action.replaceAll('.', ' ');
}

function getTimelineCategoryTone(category: Exclude<TimelineCategoryFilter, 'all'>): string {
  if (category === 'node') return 'bg-blue-500';
  if (category === 'lifecycle') return 'bg-emerald-500';
  if (category === 'binding') return 'bg-amber-500';
  if (category === 'sharing') return 'bg-violet-500';
  if (category === 'discussion') return 'bg-cyan-500';
  if (category === 'link') return 'bg-indigo-500';
  if (category === 'system') return 'bg-slate-600';
  return 'bg-slate-400';
}

function summarizeTimelinePayload(event: TimelineEvent): string | null {
  if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) return null;
  const payload = event.payload as Record<string, unknown>;

  if (event.action === 'node.sync') {
    const upserted = typeof payload.upserted === 'number' ? payload.upserted : null;
    const removed = typeof payload.removed === 'number' ? payload.removed : null;
    const previewList = Array.isArray(payload.upsertedSequencesPreview)
      ? payload.upsertedSequencesPreview.filter((item): item is string => typeof item === 'string').slice(0, 2)
      : [];
    const preview = previewList.length > 0 ? ` · ${previewList.join(', ')}` : '';
    return `upserted ${upserted ?? 0}, removed ${removed ?? 0}${preview}`;
  }

  if (event.action === 'lifecycle.publish') {
    const version = typeof payload.versionNumber === 'number' ? payload.versionNumber : null;
    const revision = typeof payload.sourceRevision === 'number' ? payload.sourceRevision : null;
    return `v${version ?? '?'} from draft r${revision ?? '?'}`;
  }

  if (event.action === 'lifecycle.draft_from_version') {
    const version = typeof payload.versionNumber === 'number' ? payload.versionNumber : null;
    const restored = typeof payload.restoredNodes === 'number' ? payload.restoredNodes : null;
    return `from v${version ?? '?'} · restored ${restored ?? 0} nodes`;
  }

  if (event.action.startsWith('binding.')) {
    const tournamentId = typeof payload.tournamentId === 'string' ? payload.tournamentId : null;
    const scopeType = typeof payload.scopeType === 'string' ? payload.scopeType : null;
    if (!tournamentId && !scopeType) return null;
    return [tournamentId, scopeType].filter(Boolean).join(' · ');
  }

  const keys = Object.keys(payload).slice(0, 3);
  if (keys.length === 0) return null;
  return keys.map((key) => `${key}`).join(' · ');
}

function getNodeSyncSequenceHints(event: TimelineEvent): {
  upserted: string[];
  removed: string[];
  upsertedMore: number;
  removedMore: number;
} | null {
  if (event.action !== 'node.sync') return null;
  if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) return null;
  const payload = event.payload as Record<string, unknown>;

  const upserted = Array.isArray(payload.upsertedSequencesPreview)
    ? payload.upsertedSequencesPreview.filter((value): value is string => typeof value === 'string')
    : [];
  const removed = Array.isArray(payload.removedSequencesPreview)
    ? payload.removedSequencesPreview.filter((value): value is string => typeof value === 'string')
    : [];
  const upsertedMore = typeof payload.upsertedSequencesMore === 'number' ? Math.max(0, payload.upsertedSequencesMore) : 0;
  const removedMore = typeof payload.removedSequencesMore === 'number' ? Math.max(0, payload.removedSequencesMore) : 0;

  if (upserted.length === 0 && removed.length === 0 && upsertedMore === 0 && removedMore === 0) return null;
  return { upserted, removed, upsertedMore, removedMore };
}

export function SystemLifecycleMenu() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [publishLabel, setPublishLabel] = useState('');
  const [publishNotes, setPublishNotes] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [bindingTournamentId, setBindingTournamentId] = useState('');
  const [bindingScopeType, setBindingScopeType] = useState<'global' | 'pair' | 'team'>('global');
  const [bindingScopeId, setBindingScopeId] = useState('');
  const [bindingVersionId, setBindingVersionId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [timelineCategory, setTimelineCategory] = useState<TimelineCategoryFilter>('all');
  const [timelineWindowDays, setTimelineWindowDays] = useState(90);

  const activeSystemId = useBiddingStore((state) => state.activeSystemId);
  const activeSystemRevision = useBiddingStore((state) => state.activeSystemRevision);
  const hasUnsavedChanges = useBiddingStore((state) => state.hasUnsavedChanges);
  const isServerSyncing = useBiddingStore((state) => state.isServerSyncing);
  const setActiveSystem = useBiddingStore((state) => state.setActiveSystem);
  const selectNode = useBiddingStore((state) => state.selectNode);
  const markServerSyncError = useBiddingStore((state) => state.markServerSyncError);

  const utils = trpc.useUtils();
  const versionsQuery = trpc.bidding.lifecycle.versions.useQuery(
    { systemId: activeSystemId ?? '' },
    {
      enabled: isAuthenticated && !!activeSystemId,
      refetchOnWindowFocus: false,
      staleTime: 20_000,
    },
  );
  const versions = useMemo(() => versionsQuery.data?.versions ?? [], [versionsQuery.data?.versions]);
  const selectedOrDefaultVersionId = useMemo(() => {
    if (!versions.length) return null;
    if (selectedVersionId && versions.some((version) => version.id === selectedVersionId)) {
      return selectedVersionId;
    }
    return versions[0].id;
  }, [selectedVersionId, versions]);

  const compareQuery = trpc.bidding.lifecycle.compare.useQuery(
    {
      systemId: activeSystemId ?? '',
      data: { versionId: selectedOrDefaultVersionId ?? '' },
    },
    {
      enabled: isAuthenticated && !!activeSystemId && !!selectedOrDefaultVersionId && isOpen,
      refetchOnWindowFocus: false,
    },
  );
  const selectedBindingVersionId = bindingVersionId || selectedOrDefaultVersionId || '';
  const bindingsQuery = trpc.bidding.bindings.list.useQuery(
    {
      systemId: activeSystemId ?? '',
      data: bindingTournamentId.trim() ? { tournamentId: bindingTournamentId.trim() } : undefined,
    },
    {
      enabled: isAuthenticated && !!activeSystemId && isOpen,
      refetchOnWindowFocus: false,
    },
  );
  const timelineQuery = trpc.bidding.lifecycle.timeline.useInfiniteQuery(
    {
      systemId: activeSystemId ?? '',
      limit: TIMELINE_PAGE_LIMIT,
      windowDays: timelineWindowDays,
      categories: timelineCategory === 'all' ? undefined : [timelineCategory],
    },
    {
      enabled: isAuthenticated && !!activeSystemId && isOpen,
      refetchOnWindowFocus: false,
      staleTime: 8_000,
      retry: 1,
      getNextPageParam: (lastPage) => {
        const nextCursor = lastPage.timeline.pageInfo.nextCursor;
        return nextCursor ?? undefined;
      },
    },
  );

  const canJumpToNode = useCallback((sequenceId: string) => {
    const state = useBiddingStore.getState();
    return !!state.nodes[sequenceId];
  }, []);

  const jumpToNode = useCallback((sequenceId: string) => {
    if (!canJumpToNode(sequenceId)) return;
    selectNode(sequenceId);
    setIsOpen(false);
  }, [canJumpToNode, selectNode]);

  const publishMutation = trpc.bidding.lifecycle.publish.useMutation({
    onSuccess: async () => {
      setPublishLabel('');
      setPublishNotes('');
      setLocalError(null);
      await Promise.all([
        utils.bidding.lifecycle.versions.invalidate({ systemId: activeSystemId ?? '' }),
        utils.bidding.systems.list.invalidate(),
        utils.bidding.lifecycle.timeline.invalidate({ systemId: activeSystemId ?? '' }),
      ]);
    },
    onError: () => {
      const message = 'Failed to publish version';
      setLocalError(message);
      markServerSyncError(message);
    },
  });

  const createDraftMutation = trpc.bidding.lifecycle.createDraft.useMutation({
    onSuccess: async ({ draft }) => {
      setActiveSystem(draft.systemId, draft.revision);
      setLocalError(null);
      await Promise.all([
        utils.bidding.systems.get.invalidate({ systemId: draft.systemId }),
        utils.bidding.systems.list.invalidate(),
        utils.bidding.lifecycle.versions.invalidate({ systemId: draft.systemId }),
        utils.bidding.lifecycle.timeline.invalidate({ systemId: draft.systemId }),
      ]);
    },
    onError: () => {
      const message = 'Failed to create draft from version';
      setLocalError(message);
      markServerSyncError(message);
    },
  });
  const upsertBindingMutation = trpc.bidding.bindings.upsert.useMutation({
    onSuccess: async () => {
      setLocalError(null);
      await Promise.all([
        utils.bidding.bindings.list.invalidate({ systemId: activeSystemId ?? '' }),
        utils.bidding.lifecycle.timeline.invalidate({ systemId: activeSystemId ?? '' }),
      ]);
    },
    onError: () => {
      const message = 'Failed to bind version to tournament scope';
      setLocalError(message);
      markServerSyncError(message);
    },
  });
  const freezeBindingMutation = trpc.bidding.bindings.freeze.useMutation({
    onSuccess: async () => {
      setLocalError(null);
      await Promise.all([
        utils.bidding.bindings.list.invalidate({ systemId: activeSystemId ?? '' }),
        utils.bidding.lifecycle.timeline.invalidate({ systemId: activeSystemId ?? '' }),
      ]);
    },
    onError: () => {
      const message = 'Failed to freeze binding';
      setLocalError(message);
      markServerSyncError(message);
    },
  });
  const removeBindingMutation = trpc.bidding.bindings.remove.useMutation({
    onSuccess: async () => {
      setLocalError(null);
      await Promise.all([
        utils.bidding.bindings.list.invalidate({ systemId: activeSystemId ?? '' }),
        utils.bidding.lifecycle.timeline.invalidate({ systemId: activeSystemId ?? '' }),
      ]);
    },
    onError: () => {
      const message = 'Failed to remove binding';
      setLocalError(message);
      markServerSyncError(message);
    },
  });
  const freezeTournamentMutation = trpc.bidding.bindings.freezeTournament.useMutation({
    onSuccess: async () => {
      setLocalError(null);
      await Promise.all([
        utils.bidding.bindings.list.invalidate({ systemId: activeSystemId ?? '' }),
        utils.bidding.lifecycle.timeline.invalidate({ systemId: activeSystemId ?? '' }),
      ]);
    },
    onError: () => {
      const message = 'Failed to freeze tournament bindings';
      setLocalError(message);
      markServerSyncError(message);
    },
  });

  const latestVersion = versions[0] ?? null;

  const timelinePages = useMemo(() => timelineQuery.data?.pages ?? [], [timelineQuery.data?.pages]);
  const timelineEvents = useMemo(
    () => timelinePages.flatMap((page) => ((page.timeline.events ?? []) as TimelineEvent[])),
    [timelinePages],
  );
  const timelinePageInfo = useMemo(
    () => ((timelinePages[timelinePages.length - 1]?.timeline.pageInfo ?? null) as TimelinePageInfo | null),
    [timelinePages],
  );

  const loadMoreTimeline = () => {
    if (!timelinePageInfo?.hasMore || timelineQuery.isFetchingNextPage) return;
    void timelineQuery.fetchNextPage();
  };

  const switchBlocked = hasUnsavedChanges || isServerSyncing;
  const switchBlockMessage = isServerSyncing
    ? 'Actions are blocked while sync is in progress.'
    : hasUnsavedChanges
      ? 'Actions are blocked until local changes are synced.'
      : '';

  const publishBlocked = !activeSystemId || switchBlocked || publishMutation.isPending;
  const restoreBlocked = !activeSystemId || switchBlocked || createDraftMutation.isPending;
  const bindBlocked = !activeSystemId
    || switchBlocked
    || !bindingTournamentId.trim()
    || (bindingScopeType !== 'global' && !bindingScopeId.trim())
    || !selectedBindingVersionId
    || upsertBindingMutation.isPending;
  const freezeTournamentBlocked = !activeSystemId
    || switchBlocked
    || !bindingTournamentId.trim()
    || freezeTournamentMutation.isPending;

  const lifecycleCaption = useMemo(() => {
    const draftRevision = activeSystemRevision ?? '-';
    const latestVersionLabel = latestVersion ? `v${latestVersion.versionNumber}` : 'no published';
    return `Draft r${draftRevision} | ${latestVersionLabel}`;
  }, [activeSystemRevision, latestVersion]);

  const runPublish = () => {
    if (!activeSystemId || publishBlocked) return;
    publishMutation.mutate({
      systemId: activeSystemId,
      data: {
        label: publishLabel.trim() || null,
        notes: publishNotes.trim() || null,
      },
    });
  };

  const runCreateDraft = (versionId: string) => {
    if (!activeSystemId || restoreBlocked) return;
    createDraftMutation.mutate({
      systemId: activeSystemId,
      data: { versionId },
    });
  };
  const runBind = () => {
    if (!activeSystemId || bindBlocked) return;
    upsertBindingMutation.mutate({
      systemId: activeSystemId,
      data: {
        tournamentId: bindingTournamentId.trim(),
        scopeType: bindingScopeType,
        scopeId: bindingScopeType === 'global' ? undefined : bindingScopeId.trim(),
        versionId: selectedBindingVersionId,
      },
    });
  };
  const runFreezeTournament = () => {
    if (!activeSystemId || freezeTournamentBlocked) return;
    freezeTournamentMutation.mutate({
      systemId: activeSystemId,
      data: { tournamentId: bindingTournamentId.trim() },
    });
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
        onClick={() => {
          setLocalError(null);
          setIsOpen((value) => !value);
        }}
        disabled={!activeSystemId}
        className={`h-8 px-3 text-sm font-medium rounded-md border flex items-center gap-2 transition-colors ${
          isOpen
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={activeSystemId ? 'Lifecycle controls' : 'No active system'}
      >
        <History className="w-4 h-4" />
        <span className="hidden xl:inline">{lifecycleCaption}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-[66] w-[460px] max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-3 py-3 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Lifecycle</div>
                <div className="text-xs text-slate-500">{lifecycleCaption}</div>
              </div>
              {latestVersion && (
                <span className="text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                  Last publish v{latestVersion.versionNumber}
                </span>
              )}
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={publishLabel}
                  onChange={(event) => setPublishLabel(event.target.value)}
                  placeholder="Version label (optional)"
                  className="h-8 w-full rounded-md border border-slate-200 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={publishNotes}
                  onChange={(event) => setPublishNotes(event.target.value)}
                  rows={2}
                  placeholder="Publish notes (optional)"
                  className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={runPublish}
                disabled={publishBlocked}
                className="h-8 px-3 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                title={publishBlocked ? switchBlockMessage || 'Cannot publish right now' : 'Publish immutable version'}
              >
                <Rocket className="w-4 h-4" />
                Publish
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              Tournament binding is optional. You can publish first and attach tournament scope later.
            </div>

            {localError && (
              <div className="text-[11px] text-rose-600">{localError}</div>
            )}
            {switchBlocked && (
              <div className="text-[11px] text-amber-700">{switchBlockMessage}</div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_1fr] min-h-[220px]">
            <div className="border-r border-slate-100">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 border-b border-slate-100">
                Published versions
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {versionsQuery.isLoading ? (
                  <div className="px-3 py-3 text-sm text-slate-500">Loading versions...</div>
                ) : versions.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-500">No published versions yet.</div>
                ) : (
                  versions.map((version) => {
                    const selected = selectedOrDefaultVersionId === version.id;
                    return (
                      <div
                        key={version.id}
                        className={`px-3 py-2 border-b border-slate-100 ${selected ? 'bg-blue-50' : ''}`}
                      >
                        <div className="text-sm font-medium text-slate-800">
                          v{version.versionNumber}{version.label ? ` · ${version.label}` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          r{version.sourceRevision} · {formatPublishedAt(version.publishedAt)}
                        </div>
                        <div className="mt-1.5 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedVersionId(version.id)}
                            className="h-6 px-2 text-[11px] rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
                          >
                            <GitCompareArrows className="w-3 h-3" />
                            Compare
                          </button>
                          <button
                            type="button"
                            onClick={() => runCreateDraft(version.id)}
                            disabled={restoreBlocked}
                            className="h-6 px-2 text-[11px] rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={restoreBlocked ? switchBlockMessage || 'Cannot restore right now' : 'Create draft from this version'}
                          >
                            Create draft
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 border-b border-slate-100">
                Draft compare
              </div>
              <div className="px-3 py-3 text-sm">
                {!selectedOrDefaultVersionId ? (
                  <div className="text-slate-500">Select version to compare.</div>
                ) : compareQuery.isLoading ? (
                  <div className="text-slate-500">Comparing draft...</div>
                ) : compareQuery.data?.comparison ? (
                  <>
                    <div className="text-slate-700 font-medium">
                      Draft r{compareQuery.data.comparison.draftRevision} vs v{compareQuery.data.comparison.versionNumber}
                    </div>
                    <div className="mt-2 text-[12px] text-slate-600 space-y-1">
                      <div>Added: {compareQuery.data.comparison.summary.added}</div>
                      <div>Removed: {compareQuery.data.comparison.summary.removed}</div>
                      <div>Changed: {compareQuery.data.comparison.summary.changed}</div>
                      <div>Unchanged: {compareQuery.data.comparison.summary.unchanged}</div>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      {compareQuery.data.comparison.changedSequenceIds.length > 0 ? (
                        <div className="space-y-1">
                          <div>Changed sequences (jump to node):</div>
                          <div className="flex flex-wrap items-center gap-1">
                            {compareQuery.data.comparison.changedSequenceIds.slice(0, 6).map((sequenceId) => {
                              const jumpable = canJumpToNode(sequenceId);
                              return (
                                <button
                                  key={sequenceId}
                                  type="button"
                                  onClick={() => jumpToNode(sequenceId)}
                                  disabled={!jumpable}
                                  className="inline-flex h-5 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 text-[10px] text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                  title={jumpable ? 'Jump to node in editor' : 'Node not present in current draft'}
                                >
                                  <MousePointer2 className="h-2.5 w-2.5" />
                                  {sequenceId}
                                </button>
                              );
                            })}
                            {compareQuery.data.comparison.changedSequenceIds.length > 6 && (
                              <span className="text-[10px] text-slate-400">
                                +{compareQuery.data.comparison.changedSequenceIds.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : 'No changed sequences'}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500">Comparison unavailable.</div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100">
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Recent activity
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={timelineCategory}
                  onChange={(event) => setTimelineCategory(event.target.value as TimelineCategoryFilter)}
                  className="h-7 min-w-[140px] rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All categories</option>
                  <option value="node">Node changes</option>
                  <option value="lifecycle">Lifecycle</option>
                  <option value="binding">Bindings</option>
                  <option value="sharing">Sharing</option>
                  <option value="discussion">Discussions</option>
                  <option value="link">Read-only links</option>
                  <option value="system">System</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={timelineWindowDays}
                  onChange={(event) => setTimelineWindowDays(Number(event.target.value))}
                  className="h-7 min-w-[104px] rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIMELINE_WINDOW_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mx-3 mb-3 max-h-[210px] overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/70">
              {timelineQuery.isLoading && timelineEvents.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-500">Loading activity timeline...</div>
              ) : timelineQuery.error && timelineEvents.length === 0 ? (
                <div className="px-3 py-3 text-xs text-rose-600">Failed to load activity timeline.</div>
              ) : timelineEvents.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-500">No events in selected category yet.</div>
              ) : (
                timelineEvents.map((event) => {
                  const payloadSummary = summarizeTimelinePayload(event);
                  const actorLabel = formatTimelineActor(event);
                  const actorProfileHref = event.actor.profileHref;
                  const actorProfileIsExternal = !!actorProfileHref && actorProfileHref.startsWith('http');
                  const nodeSyncHints = getNodeSyncSequenceHints(event);
                  return (
                    <div
                      key={event.id}
                      className="px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${getTimelineCategoryTone(event.category)}`} />
                          <span className="text-xs font-medium text-slate-700 truncate">
                            {getTimelineActionLabel(event.action)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatTimelineTime(event.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 truncate">
                        <span>by {actorLabel}</span>
                        {actorProfileHref && (
                          <a
                            href={actorProfileHref}
                            target={actorProfileIsExternal ? '_blank' : undefined}
                            rel={actorProfileIsExternal ? 'noreferrer noopener' : undefined}
                            className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
                            title="Open actor profile"
                          >
                            profile
                            <ArrowUpRight className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {payloadSummary ? <span>{` · ${payloadSummary}`}</span> : null}
                      </div>
                      {nodeSyncHints && (
                        <div className="mt-1.5 space-y-1">
                          {nodeSyncHints.upserted.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] uppercase tracking-[0.06em] text-emerald-700">
                                upserted
                              </span>
                              {nodeSyncHints.upserted.slice(0, 6).map((sequenceId) => {
                                const jumpable = canJumpToNode(sequenceId);
                                return (
                                  <button
                                    key={`${event.id}-upserted-${sequenceId}`}
                                    type="button"
                                    onClick={() => jumpToNode(sequenceId)}
                                    disabled={!jumpable}
                                    className="inline-flex h-5 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 text-[10px] text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                    title={jumpable ? 'Jump to node in editor' : 'Node not present in current draft'}
                                  >
                                    <MousePointer2 className="h-2.5 w-2.5" />
                                    {sequenceId}
                                  </button>
                                );
                              })}
                              {nodeSyncHints.upsertedMore > 0 && (
                                <span className="text-[10px] text-slate-400">
                                  +{nodeSyncHints.upsertedMore} more
                                </span>
                              )}
                            </div>
                          )}
                          {nodeSyncHints.removed.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] uppercase tracking-[0.06em] text-rose-700">
                                removed
                              </span>
                              {nodeSyncHints.removed.slice(0, 6).map((sequenceId) => (
                                <span
                                  key={`${event.id}-removed-${sequenceId}`}
                                  className="inline-flex h-5 items-center rounded-full border border-rose-200 bg-rose-50 px-2 text-[10px] text-rose-700"
                                >
                                  {sequenceId}
                                </span>
                              ))}
                              {nodeSyncHints.removedMore > 0 && (
                                <span className="text-[10px] text-slate-400">
                                  +{nodeSyncHints.removedMore} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mx-3 -mt-1 mb-3 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Window: last {timelinePageInfo?.windowDays ?? timelineWindowDays} days
              </span>
              {timelinePageInfo?.hasMore ? (
                <button
                  type="button"
                  onClick={loadMoreTimeline}
                  disabled={timelineQuery.isFetchingNextPage}
                  className="h-6 rounded-full border border-slate-200 bg-white px-2.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {timelineQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              ) : timelineEvents.length > 0 ? (
                <span className="text-[10px] text-slate-400">End of selected window</span>
              ) : null}
            </div>
          </div>

          <div className="border-t border-slate-100">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Tournament bindings (optional)
            </div>
            <div className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={bindingTournamentId}
                  onChange={(event) => setBindingTournamentId(event.target.value)}
                  placeholder="Tournament ID"
                  className="h-8 rounded-md border border-slate-200 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                  <select
                    value={bindingScopeType}
                    onChange={(event) => setBindingScopeType(event.target.value as 'global' | 'pair' | 'team')}
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="global">Global</option>
                    <option value="pair">Pair</option>
                    <option value="team">Team</option>
                  </select>
                  <input
                    type="text"
                    value={bindingScopeId}
                    onChange={(event) => setBindingScopeId(event.target.value)}
                    disabled={bindingScopeType === 'global'}
                    placeholder={bindingScopeType === 'global' ? 'N/A' : 'Scope ID'}
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <select
                  value={selectedBindingVersionId}
                  onChange={(event) => setBindingVersionId(event.target.value)}
                  className="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      v{version.versionNumber}{version.label ? ` · ${version.label}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={runBind}
                  disabled={bindBlocked}
                  className="h-8 px-3 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={bindBlocked ? 'Fill tournament/scope/version and wait for sync to finish' : 'Bind selected version'}
                >
                  Bind
                </button>
                <button
                  type="button"
                  onClick={runFreezeTournament}
                  disabled={freezeTournamentBlocked}
                  className="h-8 px-3 text-xs font-medium rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  title={freezeTournamentBlocked ? 'Enter tournament ID to freeze all active bindings' : 'Freeze all bindings for tournament'}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  Freeze all
                </button>
              </div>

              <div className="max-h-[180px] overflow-y-auto rounded-md border border-slate-100">
                {bindingsQuery.isLoading ? (
                  <div className="px-2.5 py-2 text-xs text-slate-500">Loading bindings...</div>
                ) : (bindingsQuery.data?.bindings.length ?? 0) === 0 ? (
                  <div className="px-2.5 py-2 text-xs text-slate-500">No bindings for current filter.</div>
                ) : (
                  bindingsQuery.data?.bindings.map((binding) => (
                    <div key={binding.id} className="px-2.5 py-2 border-b last:border-b-0 border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-700">
                          <span className="font-medium">{binding.tournamentId}</span>
                          {' · '}
                          <span>{formatScope(binding.scopeType, binding.scopeId)}</span>
                          {' · '}
                          <span>v{binding.versionNumber}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            binding.status === 'frozen'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {binding.status}
                        </span>
                      </div>
                      <div className="mt-1 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => freezeBindingMutation.mutate({
                            systemId: activeSystemId ?? '',
                            data: { bindingId: binding.id },
                          })}
                          disabled={switchBlocked || binding.status === 'frozen' || freezeBindingMutation.isPending}
                          className="h-6 px-2 text-[11px] rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                        >
                          <Snowflake className="w-3 h-3" />
                          Freeze
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBindingMutation.mutate({
                            systemId: activeSystemId ?? '',
                            data: { bindingId: binding.id },
                          })}
                          disabled={switchBlocked || binding.status === 'frozen' || removeBindingMutation.isPending}
                          className="h-6 px-2 text-[11px] rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
