'use client';

import { SegmentedToggle } from '@/components/ui/segmented-toggle';
import type { SignalsData } from '@/store/useBiddingStore';

const sectionLabel = 'text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] mb-1.5';

interface SignalsEditorProps {
  data: SignalsData;
  onChange: (data: SignalsData) => void;
}

export function SignalsEditor({ data, onChange }: SignalsEditorProps) {
  const update = <K extends keyof SignalsData>(key: K, value: SignalsData[K]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className={sectionLabel}>Attitude</div>
        <SegmentedToggle
          value={data.attitude}
          onChange={(val) => update('attitude', val)}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'reverse', label: 'Reverse' },
            { value: 'odd_even', label: 'Odd/Even' },
          ]}
        />
        <p className="mt-1 text-[10px] text-[#9ca3af]">
          Standard: высокая = поощряю. Reverse: низкая = поощряю.
        </p>
      </div>

      <div>
        <div className={sectionLabel}>Count</div>
        <SegmentedToggle
          value={data.count}
          onChange={(val) => update('count', val)}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'reverse', label: 'Reverse' },
          ]}
        />
        <p className="mt-1 text-[10px] text-[#9ca3af]">
          Standard: высокая-низкая = чётное кол-во. Reverse: наоборот.
        </p>
      </div>

      <div>
        <div className={sectionLabel}>Suit Preference</div>
        <SegmentedToggle
          value={data.suitPreference}
          onChange={(val) => update('suitPreference', val)}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'reverse', label: 'Reverse' },
          ]}
        />
      </div>

      <div>
        <div className={sectionLabel}>Smith Echo</div>
        <SegmentedToggle
          value={data.smithEcho ? 'yes' : 'no'}
          onChange={(val) => update('smithEcho', val === 'yes')}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      </div>

      <div>
        <div className={sectionLabel}>Trump Signals</div>
        <SegmentedToggle
          value={data.trumpSignals}
          onChange={(val) => update('trumpSignals', val)}
          options={[
            { value: 'count', label: 'Count' },
            { value: 'suit_preference', label: 'Suit Pref' },
            { value: 'none', label: 'None' },
          ]}
        />
      </div>
    </div>
  );
}
