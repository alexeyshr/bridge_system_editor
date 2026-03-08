'use client';

import { trpc } from '@/lib/trpc/react';
import { type BiddingNode, useBiddingStore } from '@/store/useBiddingStore';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

const SAVE_DEBOUNCE_MS = 900;
const DEFAULT_SYSTEM_TITLE = 'Untitled system';

function toSyncPayload(nodes: Record<string, BiddingNode>) {
  return Object.values(nodes).map((node) => ({
    sequenceId: node.id,
    payload: {
      ...node,
      id: node.id,
      context: {
        sequence: node.context.sequence,
      },
    },
  }));
}

function getTrpcErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const maybeData = (error as { data?: { code?: unknown } }).data;
  return typeof maybeData?.code === 'string' ? maybeData.code : null;
}

export function useSystemSync() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const {
    nodes,
    activeSystemId,
    activeSystemRevision,
    hasUnsavedChanges,
    setActiveSystem,
    hydrateFromRemoteSystem,
    markServerSyncStarted,
    markServerSyncSuccess,
    markServerSyncError,
    markUnsavedChanges,
  } = useBiddingStore();

  const utils = trpc.useUtils();
  const systemsQuery = trpc.bidding.systems.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  const createSystemMutation = trpc.bidding.systems.create.useMutation();
  const getSystemQuery = trpc.bidding.systems.get.useQuery(
    { systemId: activeSystemId ?? '' },
    {
      enabled: isAuthenticated && !!activeSystemId,
      refetchOnWindowFocus: false,
    },
  );
  const syncNodesMutation = trpc.bidding.nodes.sync.useMutation();
  const systemsData = systemsQuery.data;
  const isSystemsSuccess = systemsQuery.isSuccess;
  const refetchSystems = systemsQuery.refetch;
  const createSystem = createSystemMutation.mutate;
  const isCreatingSystem = createSystemMutation.isPending;
  const systemData = getSystemQuery.data;
  const refetchSystem = getSystemQuery.refetch;
  const syncNodes = syncNodesMutation.mutateAsync;
  const isSyncPending = syncNodesMutation.isPending;

  const createRequestedRef = useRef(false);
  const lastHydratedRevisionRef = useRef<number | null>(null);
  const lastSyncedNodeIdsRef = useRef<Set<string>>(new Set());
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure the authenticated user always has an active system selected.
  useEffect(() => {
    if (!isAuthenticated || !isSystemsSuccess || !systemsData) return;

    const systems = systemsData.systems;

    if (activeSystemId) {
      const activeSummary = systems.find((item) => item.id === activeSystemId);
      if (activeSummary) {
        if (activeSystemRevision !== activeSummary.revision) {
          setActiveSystem(activeSummary.id, activeSummary.revision);
        }
        return;
      }
    }

    if (systems.length > 0) {
      setActiveSystem(systems[0].id, systems[0].revision);
      return;
    }

    if (createRequestedRef.current || isCreatingSystem) return;

    createRequestedRef.current = true;
    createSystem(
      { title: DEFAULT_SYSTEM_TITLE },
      {
        onSuccess: ({ system }) => {
          setActiveSystem(system.id, system.revision);
          const nodeCount = Object.keys(useBiddingStore.getState().nodes).length;
          if (nodeCount > 0) {
            useBiddingStore.getState().markUnsavedChanges();
          }
          void refetchSystems();
        },
        onError: () => {
          markServerSyncError('Failed to create system');
        },
        onSettled: () => {
          createRequestedRef.current = false;
        },
      },
    );
  }, [
    isAuthenticated,
    isSystemsSuccess,
    systemsData,
    refetchSystems,
    activeSystemId,
    activeSystemRevision,
    setActiveSystem,
    createSystem,
    isCreatingSystem,
    markServerSyncError,
  ]);

  // Reset local sync tracking when switching systems.
  useEffect(() => {
    lastHydratedRevisionRef.current = null;
    lastSyncedNodeIdsRef.current = new Set();
  }, [activeSystemId]);

  // Hydrate store from remote snapshot.
  useEffect(() => {
    if (!isAuthenticated) return;
    const system = systemData?.system;
    if (!system) return;
    if (isSyncPending) return;
    if (lastHydratedRevisionRef.current === system.revision) return;

    const localState = useBiddingStore.getState();
    const localNodeCount = Object.keys(localState.nodes).length;

    // For a freshly created empty system, keep local graph and let autosync push it.
    if (system.nodes.length === 0 && localNodeCount > 0 && localState.hasUnsavedChanges) {
      localState.setActiveSystem(system.id, system.revision);
      lastHydratedRevisionRef.current = system.revision;
      return;
    }

    hydrateFromRemoteSystem({
      systemId: system.id,
      revision: system.revision,
      nodes: system.nodes,
    });
    lastHydratedRevisionRef.current = system.revision;
    lastSyncedNodeIdsRef.current = new Set(system.nodes.map((item) => item.sequenceId));
  }, [isAuthenticated, systemData, isSyncPending, hydrateFromRemoteSystem]);

  // Autosync local edits to backend.
  useEffect(() => {
    if (!isAuthenticated || !activeSystemId || !hasUnsavedChanges) return;
    if (isSyncPending) return;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(async () => {
      const snapshot = useBiddingStore.getState();
      if (!snapshot.activeSystemId || !snapshot.hasUnsavedChanges) return;

      const submittedNodes = snapshot.nodes;
      const submittedNodeIds = new Set(Object.keys(submittedNodes));
      const removeSequenceIds = [...lastSyncedNodeIdsRef.current].filter(
        (sequenceId) => !submittedNodeIds.has(sequenceId),
      );

      snapshot.markServerSyncStarted();

      try {
        const result = await syncNodes({
          systemId: snapshot.activeSystemId,
          data: {
            nodes: toSyncPayload(submittedNodes),
            removeSequenceIds: removeSequenceIds.length > 0 ? removeSequenceIds : undefined,
            baseRevision: snapshot.activeSystemRevision ?? undefined,
          },
        });

        lastSyncedNodeIdsRef.current = submittedNodeIds;
        const changedDuringSync = useBiddingStore.getState().nodes !== submittedNodes;
        useBiddingStore.getState().markServerSyncSuccess(result.sync.revision, !changedDuringSync);
        if (changedDuringSync) {
          useBiddingStore.getState().markUnsavedChanges();
        }

        void utils.bidding.systems.get.invalidate({ systemId: snapshot.activeSystemId });
        void utils.bidding.systems.list.invalidate();
      } catch (error) {
        const code = getTrpcErrorCode(error);
        if (code === 'CONFLICT') {
          useBiddingStore.getState().markServerSyncError('Revision conflict. Reloading latest state...');
          await refetchSystem();
        } else {
          useBiddingStore.getState().markServerSyncError('Failed to sync changes');
        }
      } finally {
        syncTimerRef.current = null;
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [
    isAuthenticated,
    activeSystemId,
    activeSystemRevision,
    hasUnsavedChanges,
    nodes,
    syncNodes,
    isSyncPending,
    utils,
    refetchSystem,
  ]);
}
