import { Search, Command, Download, Upload, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, LogIn, LogOut } from 'lucide-react';
import { useBiddingStore } from '@/store/useBiddingStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { SystemsHubMenu } from '@/components/SystemsHubMenu';
import { SystemLifecycleMenu } from '@/components/SystemLifecycleMenu';

export function TopBar() {
  const { data: session, status } = useSession();
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

  const handleExport = () => {
    const yamlStr = exportYaml();
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

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
  ], [
    canRedo,
    canUndo,
    collapseAll,
    expandAll,
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
    action.onRun();
    setIsPaletteOpen(false);
    setPaletteQuery('');
  };

  return (
    <>
      <header className="h-12 border-b border-slate-200 bg-slate-50 flex items-center px-4 justify-between shrink-0 gap-2">
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        <button 
          onClick={toggleLeftPanel}
          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors shrink-0"
          title={isLeftPanelOpen ? "Close Left Panel" : "Open Left Panel"}
        >
          {isLeftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
        <div className="hidden sm:block shrink-0">
          <Image
            src="/logo_header.png"
            alt="Bridge"
            width={300}
            height={65}
            quality={100}
            unoptimized
            className="h-10 w-auto object-contain"
            priority
          />
        </div>
        <div className="h-4 w-px bg-slate-300 hidden sm:block shrink-0" />
        <SystemsHubMenu />
        <SystemLifecycleMenu />
        <div className="relative flex-1 max-w-xs min-w-0">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-9 pr-4 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {status === 'authenticated' ? (
          <>
            <div className="hidden lg:block text-[11px] text-slate-500 max-w-[180px] truncate">
              {session.user.name || session.user.email}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="h-8 px-2 md:px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md flex items-center gap-1 md:gap-2 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1" />
          </>
        ) : (
          <>
            <Link
              href="/auth/signin"
              className="h-8 px-2 md:px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md flex items-center gap-1 md:gap-2 transition-colors"
              title="Sign in"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden md:inline">Sign in</span>
            </Link>
            <div className="h-4 w-px bg-slate-300 mx-1" />
          </>
        )}
        <div className="hidden lg:flex flex-col items-end leading-tight mr-1">
          <div
            className={`text-[11px] font-medium ${
              status === 'authenticated'
                ? isServerSyncing || hasUnsavedChanges
                  ? 'text-amber-600'
                  : 'text-emerald-600'
                : hasUnsavedChanges
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}
          >
            {status === 'authenticated'
              ? isServerSyncing
                ? 'Syncing...'
                : hasUnsavedChanges
                  ? 'Unsynced changes'
                  : 'All changes synced'
              : hasUnsavedChanges
                ? 'Unsaved changes'
                : 'All changes saved'}
          </div>
          <div className="text-[10px] text-slate-500">
            {status === 'authenticated'
              ? serverSyncError
                ? serverSyncError
                : isServerSyncing
                  ? 'Syncing to server...'
                  : lastServerSavedAt
                    ? `Server synced ${formatTime(lastServerSavedAt)}`
                    : activeSystemId
                      ? 'No server sync yet'
                      : 'Preparing workspace...'
              : isDraftSaving
                ? 'Saving draft...'
                : lastDraftSavedAt
                  ? `Draft saved ${formatTime(lastDraftSavedAt)}`
                  : 'Draft not saved yet'}
            {lastExportedAt ? ` | File saved ${formatTime(lastExportedAt)}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          className="hidden md:flex h-8 px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md items-center gap-2 transition-colors"
          title="Command palette (Ctrl/Cmd+K)"
        >
          <Command className="w-4 h-4" />
          <span>Palette</span>
        </button>
        <div className="hidden md:block h-4 w-px bg-slate-300 mx-1" />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-2 md:px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md flex items-center gap-1 md:gap-2 transition-colors"
          title="Import"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden md:inline">Import</span>
        </button>
        <button 
          onClick={handleExport}
          className="h-8 px-2 md:px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md flex items-center gap-1 md:gap-2 transition-colors"
          title="Save file"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Save</span>
        </button>
        <input 
          type="file" 
          accept=".yaml,.yml" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleImport}
        />
        <div className="h-4 w-px bg-slate-300 mx-1" />
        <button 
          onClick={toggleRightPanel}
          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          title={isRightPanelOpen ? "Close Right Panel" : "Open Right Panel"}
        >
          {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
      </div>
    </header>

      {isPaletteOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/20 backdrop-blur-[1px] flex items-start justify-center pt-20 px-4"
          onClick={() => {
            setIsPaletteOpen(false);
            setPaletteQuery('');
          }}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <input
                autoFocus
                type="text"
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                placeholder="Command palette (type to filter)"
                className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-[360px] overflow-auto py-1">
              {filteredPaletteActions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500">No commands found.</div>
              ) : (
                filteredPaletteActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={action.disabled}
                    onClick={() => runPaletteAction(action)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                      action.disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{action.label}</span>
                    {action.disabled && (
                      <span className="text-[10px] text-slate-400">unavailable</span>
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
