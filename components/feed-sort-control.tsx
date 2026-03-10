"use client"

import * as React from "react"
import { ArrowUpDownIcon, CheckIcon, ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type SortOption = {
  label: string
  value: string
}

const sortOptions: SortOption[] = [
  { label: "Newest", value: "newest" },
  { label: "Popular", value: "popular" },
  { label: "Most active", value: "active" },
]

export function FeedSortControl({ className }: { className?: string }) {
  const [selected, setSelected] = React.useState<SortOption>(sortOptions[0])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Sort feed"
        className={cn(
          "hidden items-center gap-2 rounded-xl border border-[#cfd5df] bg-white px-2.5 py-1.5 text-[#1f2734] shadow-sm transition-colors hover:bg-[#edf2fa] md:inline-flex",
          className
        )}
      >
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-[#eef2f8] text-[#667287]">
          <ArrowUpDownIcon className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#707b8d]">
          Sort
        </span>
        <span className="text-sm font-semibold">{selected.label}</span>
        <ChevronDownIcon className="size-4 text-[#6e7788]" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-52 rounded-xl border border-[#cfd5df] bg-white/98 p-1.5 text-[#1f2734] shadow-[0_12px_35px_-20px_rgba(15,23,42,0.75)]"
      >
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setSelected(option)}
            className={cn(
              "flex items-center justify-between rounded-lg px-2.5 py-2 text-[15px] font-medium text-[#1f2734] focus:bg-[#e6edf9] focus:text-[#12213c]",
              selected.value === option.value && "bg-[#e9effb] text-[#12213c]"
            )}
          >
            <span>{option.label}</span>
            {selected.value === option.value ? (
              <CheckIcon className="size-4 text-[#2a4d91]" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
