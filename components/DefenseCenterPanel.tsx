'use client';

import { useBiddingStore } from '@/store/useBiddingStore';
import type { LeadsData, SignalsData, DiscardsData, VsConventionData, CustomDefenseData } from '@/store/useBiddingStore';
import { SignalsEditor } from '@/components/defense/SignalsEditor';
import { DiscardsEditor } from '@/components/defense/DiscardsEditor';
import { LeadsEditor } from '@/components/defense/LeadsEditor';
import { VsConventionEditor } from '@/components/defense/VsConventionEditor';
import { Pencil, Check, X } from 'lucide-react';
import { useState } from 'react';

const CATEGORY_LABELS: Record<string, string> = {
  leads_suit: 'Атака vs масть',
  leads_nt: 'Атака vs NT',
  signals: 'Сигналы',
  discards: 'Сбросы',
  vs_convention: 'Защита vs конвенции',
  custom: 'Пользовательский',
};

export function DefenseCenterPanel({ contextId }: { contextId: string }) {
  const ctx = useBiddingStore((s) => s.defenseContextsById[contextId]);
  const updateDefenseStructured = useBiddingStore((s) => s.updateDefenseStructured);
  const updateDefenseContext = useBiddingStore((s) => s.updateDefenseContext);
  const addDefenseEntry = useBiddingStore((s) => s.addDefenseEntry);
  const updateDefenseEntry = useBiddingStore((s) => s.updateDefenseEntry);
  const removeDefenseEntry = useBiddingStore((s) => s.removeDefenseEntry);
  const addLeadHolding = useBiddingStore((s) => s.addLeadHolding);
  const updateLeadHolding = useBiddingStore((s) => s.updateLeadHolding);
  const removeLeadHolding = useBiddingStore((s) => s.removeLeadHolding);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  if (!ctx) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#9ca3af] text-sm">
        Defense context not found
      </div>
    );
  }

  const startEditTitle = () => {
    setTitleDraft(ctx.title);
    setIsEditingTitle(true);
  };

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== ctx.title) {
      updateDefenseContext(contextId, { title: trimmed });
    }
    setIsEditingTitle(false);
  };

  const handleNotesChange = (notes: string) => {
    updateDefenseContext(contextId, { notes });
  };

  const renderEditor = () => {
    const { structured } = ctx;

    switch (structured.kind) {
      case 'signals':
        return (
          <SignalsEditor
            data={structured}
            onChange={(data) => updateDefenseStructured(contextId, data)}
          />
        );

      case 'discards':
        return (
          <DiscardsEditor
            data={structured}
            onChange={(data) => updateDefenseStructured(contextId, data)}
          />
        );

      case 'leads':
        return (
          <LeadsEditor
            data={structured}
            onChange={(data) => updateDefenseStructured(contextId, data)}
            onAddHolding={() => addLeadHolding(contextId)}
            onUpdateHolding={(rowId, updates) => updateLeadHolding(contextId, rowId, updates)}
            onRemoveHolding={(rowId) => removeLeadHolding(contextId, rowId)}
          />
        );

      case 'vs_convention':
      case 'custom':
        return (
          <VsConventionEditor
            data={structured}
            onAddEntry={() => addDefenseEntry(contextId)}
            onUpdateEntry={(entryId, updates) => updateDefenseEntry(contextId, entryId, updates)}
            onRemoveEntry={(entryId) => removeDefenseEntry(contextId, entryId)}
            onUpdateConventionName={
              structured.kind === 'vs_convention'
                ? (name) => updateDefenseStructured(contextId, { ...structured, opponentConvention: name } as VsConventionData)
                : undefined
            }
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Title */}
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                className="flex-1 h-8 rounded-md border border-[#e5e7eb] bg-white px-2 text-sm font-semibold text-[#1f2734] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
              />
              <button type="button" onClick={commitTitle} className="text-green-600 hover:text-green-700 p-1">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setIsEditingTitle(false)} className="text-[#9ca3af] hover:text-[#6b7280] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-[#1f2734]">{ctx.title}</h2>
              <button type="button" onClick={startEditTitle} className="text-[#9ca3af] hover:text-[#6b7280] p-1">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-wide text-[#9ca3af]">
            {CATEGORY_LABELS[ctx.category] ?? ctx.category}
          </span>
        </div>

        {/* Structured editor */}
        <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
          {renderEditor()}
        </div>

        {/* Notes */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] mb-1.5">
            Notes
          </div>
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[12px] text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20 resize-y"
            value={ctx.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Additional notes..."
          />
        </div>
      </div>
    </div>
  );
}
