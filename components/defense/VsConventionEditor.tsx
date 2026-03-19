'use client';

import { Trash2, Plus } from 'lucide-react';
import type { VsConventionData, CustomDefenseData, DefenseEntry } from '@/store/useBiddingStore';

const cellInput = 'h-7 w-full rounded-md border border-[#e5e7eb] bg-white px-2 text-[11px] text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20';
const sectionLabel = 'text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] mb-1.5';

interface VsConventionEditorProps {
  data: VsConventionData | CustomDefenseData;
  onAddEntry: () => void;
  onUpdateEntry: (entryId: string, updates: Partial<DefenseEntry>) => void;
  onRemoveEntry: (entryId: string) => void;
  onUpdateConventionName?: (name: string) => void;
}

export function VsConventionEditor({ data, onAddEntry, onUpdateEntry, onRemoveEntry, onUpdateConventionName }: VsConventionEditorProps) {
  return (
    <div className="space-y-5">
      {data.kind === 'vs_convention' && (
        <div>
          <div className={sectionLabel}>Opponent Convention</div>
          <input
            className={cellInput}
            value={data.opponentConvention}
            onChange={(e) => onUpdateConventionName?.(e.target.value)}
            placeholder="Strong 1NT (15-17)"
          />
        </div>
      )}

      <div>
        <div className={sectionLabel}>Defensive Actions</div>
        <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="grid grid-cols-[100px_1fr_60px_60px_32px] gap-px bg-[#e5e7eb]">
            <div className="bg-[#f9fafb] px-2 py-1.5 text-[10px] font-semibold uppercase text-[#6b7280]">Action</div>
            <div className="bg-[#f9fafb] px-2 py-1.5 text-[10px] font-semibold uppercase text-[#6b7280]">Meaning</div>
            <div className="bg-[#f9fafb] px-2 py-1.5 text-[10px] font-semibold uppercase text-[#6b7280]">Min</div>
            <div className="bg-[#f9fafb] px-2 py-1.5 text-[10px] font-semibold uppercase text-[#6b7280]">Max</div>
            <div className="bg-[#f9fafb]" />
          </div>
          {data.entries.map((entry) => (
            <div key={entry.id} className="grid grid-cols-[100px_1fr_60px_60px_32px] gap-px bg-[#e5e7eb]">
              <div className="bg-white p-1">
                <input
                  className={cellInput}
                  value={entry.action}
                  onChange={(e) => onUpdateEntry(entry.id, { action: e.target.value })}
                  placeholder="X"
                />
              </div>
              <div className="bg-white p-1">
                <input
                  className={cellInput}
                  value={entry.meaning}
                  onChange={(e) => onUpdateEntry(entry.id, { meaning: e.target.value })}
                  placeholder="Penalty"
                />
              </div>
              <div className="bg-white p-1">
                <input
                  className={cellInput}
                  type="number"
                  value={entry.hcpMin ?? ''}
                  onChange={(e) => onUpdateEntry(entry.id, { hcpMin: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder=""
                />
              </div>
              <div className="bg-white p-1">
                <input
                  className={cellInput}
                  type="number"
                  value={entry.hcpMax ?? ''}
                  onChange={(e) => onUpdateEntry(entry.id, { hcpMax: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder=""
                />
              </div>
              <div className="bg-white flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onRemoveEntry(entry.id)}
                  className="text-[#9ca3af] hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddEntry}
          className="mt-2 flex items-center gap-1 text-[11px] text-[#6b7280] hover:text-[#374151] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add action
        </button>
      </div>
    </div>
  );
}
