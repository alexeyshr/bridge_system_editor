"use client"

import Image from "next/image"

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
        "inline-flex size-9 items-center justify-center rounded-md border border-[#cfd5df] bg-transparent transition-colors hover:bg-[#eef2f7]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa5bb]",
        className
      )}
    >
      <Image
        src="/dashboard-toggle-favicon.svg"
        alt=""
        width={24}
        height={24}
        className="size-6 select-none"
        aria-hidden="true"
      />
      <span className="sr-only">{actionLabel}</span>
    </button>
  )
}
