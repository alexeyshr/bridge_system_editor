"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function DashboardFaviconToggle({ className }: { className?: string }) {
  const { open, toggleSidebar } = useSidebar()
  const actionLabel = open ? "Collapse left panel" : "Expand left panel"

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={actionLabel}
      title={actionLabel}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md bg-transparent transition-colors hover:bg-[#eef2f7]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa5bb]",
        className
      )}
    >
      {open ? (
        <svg
          viewBox="0 0 24 24"
          className="size-9 select-none"
          aria-hidden="true"
        >
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
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="size-9 select-none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8.5"
            fill="none"
            stroke="#4b4f57"
            strokeWidth="1.9"
          />
          <circle
            cx="12"
            cy="12"
            r="3.2"
            fill="#b32d32"
          />
        </svg>
      )}
      <span className="sr-only">
        {actionLabel}
      </span>
    </button>
  )
}
