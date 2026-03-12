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

export type FeedSortValue = "newest" | "popular" | "active"

type SortOption = {
  label: string
  value: FeedSortValue
}

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest", value: "newest" },
  { label: "Popular", value: "popular" },
  { label: "Most active", value: "active" },
]

type FeedSortControlProps = {
  className?: string
  value?: FeedSortValue
  onValueChange?: (value: FeedSortValue) => void
}

export function FeedSortControl({
  className,
  value,
  onValueChange,
}: FeedSortControlProps) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState<FeedSortValue>("newest")
  const selectedValue = isControlled ? value : internalValue
  const selected = SORT_OPTIONS.find((option) => option.value === selectedValue) ?? SORT_OPTIONS[0]

  const handleSelect = (next: FeedSortValue) => {
    if (!isControlled) {
      setInternalValue(next)
    }
    onValueChange?.(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Sort feed"
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-[#cfd5df] bg-white px-2.5 py-1.5 text-[#1f2734] shadow-sm transition-colors hover:bg-[#edf2fa]",
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
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
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
