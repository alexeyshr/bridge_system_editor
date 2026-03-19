'use client';

import { SegmentedToggle } from '@/components/ui/segmented-toggle';
import type { DiscardsData } from '@/store/useBiddingStore';

const sectionLabel = 'text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6b7280] mb-1.5';

interface DiscardsEditorProps {
  data: DiscardsData;
  onChange: (data: DiscardsData) => void;
}

export function DiscardsEditor({ data, onChange }: DiscardsEditorProps) {
  const update = <K extends keyof DiscardsData>(key: K, value: DiscardsData[K]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className={sectionLabel}>Method</div>
        <SegmentedToggle
          value={data.method}
          onChange={(val) => update('method', val)}
          options={[
            { value: 'natural', label: 'Natural' },
            { value: 'lavinthal', label: 'Лавинталь' },
            { value: 'odd_even', label: 'Odd/Even' },
            { value: 'revolving', label: 'Revolving' },
          ]}
        />
        <p className="mt-1 text-[10px] text-[#9ca3af]">
          {data.method === 'lavinthal' && 'Низкая карта = нижняя масть, высокая = верхняя.'}
          {data.method === 'odd_even' && 'Нечётная = поощряю, чётная = не поощряю / масть.'}
          {data.method === 'natural' && 'Высокая = поощряю эту масть.'}
          {data.method === 'revolving' && 'Следующая масть по кругу.'}
        </p>
      </div>

      <div>
        <div className={sectionLabel}>First Discard Priority</div>
        <SegmentedToggle
          value={data.firstDiscard}
          onChange={(val) => update('firstDiscard', val)}
          options={[
            { value: 'attitude', label: 'Attitude' },
            { value: 'count', label: 'Count' },
            { value: 'suit_preference', label: 'Suit Pref' },
          ]}
        />
      </div>
    </div>
  );
}
