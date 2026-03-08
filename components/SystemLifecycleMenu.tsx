'use client';

import { trpc } from '@/lib/trpc/react';
import { useBiddingStore } from '@/store/useBiddingStore';
import { GitCompareArrows, History, Rocket } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

export function SystemLifecycleMenu() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [publishLabel, setPublishLabel] = useState('');
  const [publishNotes, setPublishNotes] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeSystemId = useBiddingStore((state) => state.activeSystemId);
  const activeSystemRevision = useBiddingStore((state) => state.activeSystemRevision);
  const hasUnsavedChanges = useBiddingStore((state) => state.hasUnsavedChanges);
  const isServerSyncing = useBiddingStore((state) => state.isServerSyncing);
  const setActiveSystem = useBiddingStore((state) => state.setActiveSystem);
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

  const publishMutation = trpc.bidding.lifecycle.publish.useMutation({
    onSuccess: async () => {
      setPublishLabel('');
      setPublishNotes('');
      setLocalError(null);
      await Promise.all([
        utils.bidding.lifecycle.versions.invalidate({ systemId: activeSystemId ?? '' }),
        utils.bidding.systems.list.invalidate(),
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
      ]);
    },
    onError: () => {
      const message = 'Failed to create draft from version';
      setLocalError(message);
      markServerSyncError(message);
    },
  });

  const latestVersion = versions[0] ?? null;

  const switchBlocked = hasUnsavedChanges || isServerSyncing;
  const switchBlockMessage = isServerSyncing
    ? 'Actions are blocked while sync is in progress.'
    : hasUnsavedChanges
      ? 'Actions are blocked until local changes are synced.'
      : '';

  const publishBlocked = !activeSystemId || switchBlocked || publishMutation.isPending;
  const restoreBlocked = !activeSystemId || switchBlocked || createDraftMutation.isPending;

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
                      {compareQuery.data.comparison.changedSequenceIds.length > 0
                        ? `Changed examples: ${compareQuery.data.comparison.changedSequenceIds.slice(0, 3).join(', ')}`
                        : 'No changed sequences'}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500">Comparison unavailable.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
