'use client';

import { SegmentedToggle } from '@/components/ui/segmented-toggle';
import { Trash2, Plus } from 'lucide-react';
import type { LeadsData, LeadHoldingRow } from '@/store/useBiddingStore';

const sectionLabel = 'text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] mb-1.5';
const cellInput = 'h-7 w-full rounded-md border border-[#e5e7eb] bg-white px-2 text-[11px] text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20';

interface LeadsEditorProps {
  data: LeadsData;
  onChange: (data: LeadsData) => void;
  onAddHolding: () => void;
  onUpdateHolding: (rowId: string, updates: Partial<LeadHoldingRow>) => void;
  onRemoveHolding: (rowId: string) => void;
}

export function LeadsEditor({ data, onChange, onAddHolding, onUpdateHolding, onRemoveHolding }: LeadsEditorProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className={sectionLabel}>Lead Style</div>
        <SegmentedToggle
          value={data.leadStyle}
          onChange={(val) => onChange({ ...data, leadStyle: val })}
          options={[
            { value: '4th_best', label: '4th best' },
            { value: '3rd_5th', label: '3rd/5th' },
            { value: 'attitude', label: 'Attitude' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </div>

      <div>
        <div className={sectionLabel}>Holdings</div>
        <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-px bg-[#e5e7eb]">
            <div className="bg-[#f9fafb] px-2 py-1.5 text-[10px] font-semibold uppercase text-[#6b7280]">Holding</div>
            <div className="bg-[#f9fafb] px-2 py-1.5 text-[10px] font-semibold uppercase text-[#6b7280]">Lead</div>
            <div className="bg-[#f9fafb] px-2 py-1.5 text-[10px] font-semibold uppercase text-[#6b7280]">Notes</div>
            <div className="bg-[#f9fafb]" />
          </div>
          {data.holdings.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-px bg-[#e5e7eb]">
              <div className="bg-white p-1">
                <input
                  className={cellInput}
                  value={row.holding}
                  onChange={(e) => onUpdateHolding(row.id, { holding: e.target.value })}
                  placeholder="AKx"
                />
              </div>
              <div className="bg-white p-1">
                <input
                  className={cellInput}
                  value={row.lead}
                  onChange={(e) => onUpdateHolding(row.id, { lead: e.target.value })}
                  placeholder="K"
                />
              </div>
              <div className="bg-white p-1">
                <input
                  className={cellInput}
                  value={row.notes ?? ''}
                  onChange={(e) => onUpdateHolding(row.id, { notes: e.target.value })}
                  placeholder=""
                />
              </div>
              <div className="bg-white flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onRemoveHolding(row.id)}
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
          onClick={onAddHolding}
          className="mt-2 flex items-center gap-1 text-[11px] text-[#6b7280] hover:text-[#374151] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add holding
        </button>
      </div>
    </div>
  );
}
