"use client"

import { cn } from "@/lib/utils"

type TopbarSuitIconsProps = {
  className?: string
  onSpadeClick?: () => void
  onHeartClick?: () => void
  onDiamondClick?: () => void
  onClubClick?: () => void
}

export function TopbarSuitIcons({
  className,
  onSpadeClick,
  onHeartClick,
  onDiamondClick,
  onClubClick,
}: TopbarSuitIconsProps) {
  const baseButtonClass =
    "inline-flex size-9 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[25px] leading-none shadow-none transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa5bb]"

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)} role="group" aria-label="Portal suit actions">
      <button
        type="button"
        aria-label="Spade action"
        title="Spade action"
        className={cn(baseButtonClass, "text-[#2d3750]")}
        onClick={onSpadeClick}
      >
        {"\u2660"}
      </button>
      <button
        type="button"
        aria-label="Heart action"
        title="Heart action"
        className={cn(baseButtonClass, "text-[#b32d32]")}
        onClick={onHeartClick}
      >
        {"\u2665"}
      </button>
      <button
        type="button"
        aria-label="Diamond action"
        title="Diamond action"
        className={cn(baseButtonClass, "text-[#cc5b28]")}
        onClick={onDiamondClick}
      >
        {"\u2666"}
      </button>
      <button
        type="button"
        aria-label="Club action"
        title="Club action"
        className={cn(baseButtonClass, "text-[#4b4f57]")}
        onClick={onClubClick}
      >
        <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="8.5"
            fill="none"
            stroke="#4b4f57"
            strokeWidth="1.9"
          />
          <text
            x="12"
            y="15.2"
            textAnchor="middle"
            fontSize="11.4"
            fill="#4b4f57"
            fontFamily="Georgia, serif"
          >
            {"\u2663"}
          </text>
        </svg>
      </button>
    </div>
  )
}
