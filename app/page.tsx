'use client';

import { TopBar } from '@/components/TopBar';
import { LeftPanel } from '@/components/LeftPanel';
import { CenterPanel } from '@/components/CenterPanel';
import { RightPanel } from '@/components/RightPanel';

import { useBiddingStore } from '@/store/useBiddingStore';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useEffect, useState } from 'react';
import { useSystemSync } from '@/hooks/useSystemSync';

export default function Page() {
  const { isLeftPanelOpen, isRightPanelOpen } = useBiddingStore();
  const [isMobile, setIsMobile] = useState(false);
  useSystemSync();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = useBiddingStore.getState();
      if (!state.hasUnsavedChanges) return;
      state.flushDraftSave();
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const shouldIgnoreTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tagName = element.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
      return element.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || shouldIgnoreTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const modifierPressed = event.ctrlKey || event.metaKey;
      if (!modifierPressed) return;

      const state = useBiddingStore.getState();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || key === 'y';

      if (isUndo && state.canUndo) {
        event.preventDefault();
        state.undo();
        return;
      }
      if (isRedo && state.canRedo) {
        event.preventDefault();
        state.redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900 overflow-hidden font-sans">
      <TopBar />
      <div className="flex flex-1 overflow-hidden relative">
        {isMobile ? (
          // Mobile Layout
          <div className="flex-1 w-full h-full relative">
            <CenterPanel />
            
            {/* Mobile Overlays */}
            {isLeftPanelOpen && (
              <div className="absolute inset-0 z-40 bg-white">
                <LeftPanel />
              </div>
            )}
            
            {isRightPanelOpen && (
              <div className="absolute inset-0 z-40 bg-white">
                <RightPanel />
              </div>
            )}
          </div>
        ) : (
          // Desktop Layout
          <Group orientation="horizontal">
            {isLeftPanelOpen && (
              <>
                <Panel defaultSize={20} minSize={10} collapsible={true}>
                  <LeftPanel />
                </Panel>
                <Separator className="w-1 bg-[#DBEAFE] hover:bg-[#BFDBFE] transition-colors cursor-col-resize" />
              </>
            )}
            
            <Panel defaultSize={isLeftPanelOpen && isRightPanelOpen ? 60 : isLeftPanelOpen || isRightPanelOpen ? 80 : 100} minSize={10}>
              <CenterPanel />
            </Panel>
            
            {isRightPanelOpen && (
              <>
                <Separator className="w-1 bg-[#DBEAFE] hover:bg-[#BFDBFE] transition-colors cursor-col-resize" />
                <Panel defaultSize={20} minSize={10} collapsible={true}>
                  <RightPanel />
                </Panel>
              </>
            )}
          </Group>
        )}
      </div>
    </div>
  );
}
