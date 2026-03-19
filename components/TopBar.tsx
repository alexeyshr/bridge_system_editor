import { Search, Command, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, LogIn, LogOut } from 'lucide-react';
import { useBiddingStore } from '@/store/useBiddingStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/react';
import { SystemsHubMenu } from '@/components/SystemsHubMenu';
import { SystemLifecycleMenu } from '@/components/SystemLifecycleMenu';

/* ── Tooltip (CSS-only, styled) ── */
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

export function TopBar() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const {
    searchQuery,
    setSearchQuery,
    exportYaml,
    importYaml,
    isLeftPanelOpen,
    isRightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    expandAll,
    collapseAll,
    undo,
    redo,
    canUndo,
    canRedo,
    treeViewMode,
    setTreeViewMode,
    setLeftPrimaryMode,
    setActiveRootEntryNodeId,
    setActiveSectionId,
    setActiveSmartViewId,
    activeSystemId,
    hasUnsavedChanges,
    isDraftSaving,
    isServerSyncing,
    serverSyncError,
    lastDraftSavedAt,
    lastServerSavedAt,
    lastExportedAt,
  } = useBiddingStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  /* ── Active system title from cached list ── */
  const systemsListQuery = trpc.bidding.systems.list.useQuery({}, {
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const activeSystemTitle = useMemo(
    () => systemsListQuery.data?.systems?.find((s) => s.id === activeSystemId)?.title ?? null,
    [systemsListQuery.data?.systems, activeSystemId],
  );

  const handleExport = useMemo(() => () => {
    const yamlStr = exportYaml();
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportYaml]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        importYaml(result);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const paletteActions = useMemo(() => [
    {
      id: 'expand-all',
      label: 'Expand all nodes',
      keywords: 'expand tree',
      onRun: () => expandAll(),
      disabled: false,
    },
    {
      id: 'collapse-all',
      label: 'Collapse all nodes',
      keywords: 'collapse tree',
      onRun: () => collapseAll(),
      disabled: false,
    },
    {
      id: 'undo',
      label: 'Undo',
      keywords: 'history back',
      onRun: () => undo(),
      disabled: !canUndo,
    },
    {
      id: 'redo',
      label: 'Redo',
      keywords: 'history forward',
      onRun: () => redo(),
      disabled: !canRedo,
    },
    {
      id: 'toggle-left-panel',
      label: isLeftPanelOpen ? 'Close left panel' : 'Open left panel',
      keywords: 'left panel',
      onRun: () => toggleLeftPanel(),
      disabled: false,
    },
    {
      id: 'toggle-right-panel',
      label: isRightPanelOpen ? 'Close right panel' : 'Open right panel',
      keywords: 'right panel',
      onRun: () => toggleRightPanel(),
      disabled: false,
    },
    {
      id: 'set-classic-view',
      label: 'Switch center view to Classic',
      keywords: 'classic lanes',
      onRun: () => setTreeViewMode('classic'),
      disabled: treeViewMode === 'classic',
    },
    {
      id: 'set-compact-view',
      label: 'Switch center view to Compact',
      keywords: 'compact lanes',
      onRun: () => setTreeViewMode('compact'),
      disabled: treeViewMode === 'compact',
    },
    {
      id: 'clear-primary-filter',
      label: 'Clear primary filter',
      keywords: 'clear section smart root filter',
      onRun: () => {
        setLeftPrimaryMode('roots');
        setActiveRootEntryNodeId(null);
        setActiveSectionId(null);
        setActiveSmartViewId(null);
      },
      disabled: false,
    },
    {
      id: 'export-yaml',
      label: 'Export system to YAML',
      keywords: 'save export yaml download file',
      onRun: () => handleExport(),
      disabled: false,
    },
    {
      id: 'import-yaml',
      label: 'Import system from YAML',
      keywords: 'import upload yaml file',
      onRun: () => { /* handled in runPaletteAction */ },
      disabled: false,
    },
  ], [
    canRedo,
    canUndo,
    collapseAll,
    expandAll,
    handleExport,
    isLeftPanelOpen,
    isRightPanelOpen,
    redo,
    setActiveRootEntryNodeId,
    setActiveSectionId,
    setActiveSmartViewId,
    setLeftPrimaryMode,
    setTreeViewMode,
    toggleLeftPanel,
    toggleRightPanel,
    treeViewMode,
    undo,
  ]);

  const filteredPaletteActions = useMemo(() => {
    const query = paletteQuery.trim().toLocaleLowerCase();
    if (!query) return paletteActions;
    return paletteActions.filter((action) => (
      action.label.toLocaleLowerCase().includes(query)
      || action.keywords.toLocaleLowerCase().includes(query)
    ));
  }, [paletteActions, paletteQuery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifierPressed = event.ctrlKey || event.metaKey;
      if (modifierPressed && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        setIsPaletteOpen(false);
        setPaletteQuery('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const runPaletteAction = (action: (typeof paletteActions)[number]) => {
    if (action.disabled) return;
    if (action.id === 'import-yaml') {
      fileInputRef.current?.click();
    } else {
      action.onRun();
    }
    setIsPaletteOpen(false);
    setPaletteQuery('');
  };

  /* ── sync status helpers ── */
  const syncDotColor = (() => {
    if (serverSyncError) return 'bg-red-400';
    if (isServerSyncing || isDraftSaving || hasUnsavedChanges) return 'bg-amber-400 animate-pulse';
    return 'bg-emerald-400';
  })();

  const syncLabel = (() => {
    if (isAuthenticated) {
      if (isServerSyncing) return 'Syncing…';
      if (hasUnsavedChanges) return 'Unsynced';
      return 'Synced';
    }
    if (hasUnsavedChanges) return 'Unsaved';
    return 'Saved';
  })();

  const syncDetail = (() => {
    if (isAuthenticated) {
      if (serverSyncError) return serverSyncError;
      if (isServerSyncing) return 'Syncing to server…';
      if (lastServerSavedAt) return formatTime(lastServerSavedAt);
      if (activeSystemId) return 'No sync yet';
      return 'Preparing…';
    }
    if (isDraftSaving) return 'Saving…';
    if (lastDraftSavedAt) return formatTime(lastDraftSavedAt);
    return 'Not saved';
  })();

  const btnClass = "flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#1f2734]";

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#e5e7eb] bg-[#fafbfc] px-4">
        {/* ── Left: navigation + context ── */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <Tooltip label={isLeftPanelOpen ? 'Close left panel' : 'Open left panel'} side="bottom">
            <button
              onClick={toggleLeftPanel}
              className="shrink-0 rounded-md p-1.5 text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#6b7280]"
            >
              {isLeftPanelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
          </Tooltip>

          {/* Logo: ♣ in circle + "Bridge" */}
          <Link
            href="/dashboard"
            className="hidden shrink-0 items-center gap-1.5 sm:inline-flex"
            aria-label="Bridge OneClub"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" className="h-7 w-7 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#2c354d" strokeWidth="1.8" />
              <text x="12" y="15.5" textAnchor="middle" fontSize="12" fill="#2c354d" fontFamily="Georgia, serif">
                {'\u2663'}
              </text>
            </svg>
            <span className="text-sm font-bold tracking-tight text-[#2c354d]">Bridge</span>
          </Link>

          <div className="hidden h-5 w-px bg-[#e5e7eb] sm:block" />

          <SystemsHubMenu />
          <SystemLifecycleMenu />

          {/* Active system name */}
          {activeSystemTitle && (
            <>
              <div className="hidden h-5 w-px bg-[#e5e7eb] md:block" />
              <span className="hidden max-w-[220px] truncate text-sm font-medium text-[#1f2734] md:block">
                {activeSystemTitle}
              </span>
            </>
          )}

          {/* Search */}
          <div className="relative min-w-0 max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-4 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
          </div>
        </div>

        {/* ── Right: status + utilities + auth ── */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Sync status pill */}
          <Tooltip label={syncDetail || syncLabel} side="bottom">
            <div className="hidden items-center gap-1.5 rounded-full border border-[#e5e7eb] px-2.5 py-1 lg:inline-flex">
              <span className={`size-1.5 shrink-0 rounded-full ${syncDotColor}`} />
              <span className="text-[11px] font-medium text-[#6b7280]">{syncLabel}</span>
              {syncDetail && <span className="text-[10px] text-[#9ca3af]">{syncDetail}</span>}
              {lastExportedAt && <span className="text-[10px] text-[#9ca3af]">| File {formatTime(lastExportedAt)}</span>}
            </div>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-[#e5e7eb]" />

          <Tooltip label={isRightPanelOpen ? 'Close right panel' : 'Open right panel'} side="bottom">
            <button
              onClick={toggleRightPanel}
              className="shrink-0 rounded-md p-1.5 text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#6b7280]"
            >
              {isRightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Hidden file input for YAML import (triggered from Command Palette) */}
      <input
        type="file"
        accept=".yaml,.yml"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImport}
      />

      {/* Command Palette */}
      {isPaletteOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-[#1f2734]/15 px-4 pt-20 backdrop-blur-[1px]"
          onClick={() => {
            setIsPaletteOpen(false);
            setPaletteQuery('');
          }}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#f0f0f0] px-3 py-2">
              <input
                autoFocus
                type="text"
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                placeholder="Command palette (type to filter)"
                className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
              />
            </div>
            <div className="max-h-[360px] overflow-auto py-1">
              {filteredPaletteActions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-[#9ca3af]">No commands found.</div>
              ) : (
                filteredPaletteActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={action.disabled}
                    onClick={() => runPaletteAction(action)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                      action.disabled
                        ? 'cursor-not-allowed text-[#d1d5db]'
                        : 'text-[#374151] hover:bg-[#fafbfc]'
                    }`}
                  >
                    <span>{action.label}</span>
                    {action.disabled && (
                      <span className="text-[10px] text-[#9ca3af]">unavailable</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
