'use client';

interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedToggleOption<T>[];
}

export function SegmentedToggle<T extends string>({ value, onChange, options }: SegmentedToggleProps<T>) {
  return (
    <div className="inline-flex h-7 items-center rounded-lg border border-[#e5e7eb] bg-white p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`h-6 px-2.5 text-[11px] font-medium rounded-md transition-colors ${
            opt.value === value
              ? 'bg-[#1f2734] text-white shadow-sm'
              : 'text-[#6b7280] hover:text-[#374151]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
