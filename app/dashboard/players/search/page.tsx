"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  MapPinIcon,
  SearchIcon,
  ShieldUserIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { DashboardShellPage } from "@/components/dashboard-shell-page"
import {
  DropdownMenuCheckboxItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type PlayerSearchRow = {
  id: string
  sourcePlayerId: number
  name: string
  city: string | null
  rank: string | null
  rating: number | null
  ratingPosition: number | null
  maxRatingPosition: number | null
  prizePoints: number | null
  masterPoints: number | null
  club: string | null
  tournamentsCount: number
  profileUrl: string | null
  gamblerNick: string | null
  bboNick: string | null
}

type PlayerSearchResponse = {
  ready: boolean
  generatedAt: string
  query: string
  city: string
  citiesSelected: string[]
  sort: "rating" | "prize" | "master" | "name" | "tournaments"
  rank: string
  ranksSelected: string[]
  ratingMin: number | null
  ratingMax: number | null
  prizeMin: number | null
  prizeMax: number | null
  masterMin: number | null
  masterMax: number | null
  total: number
  page: number
  pageSize: number
  totalPages: number
  rows: PlayerSearchRow[]
  cities: string[]
  message?: string
}

const PAGE_SIZE = 24
const SORT_OPTIONS = [
  { value: "rating", label: "Sort: rating" },
  { value: "prize", label: "Sort: ПБ" },
  { value: "master", label: "Sort: МБ" },
  { value: "name", label: "Sort: name" },
  { value: "tournaments", label: "Sort: tournaments" },
] as const
const RANK_OPTIONS = Array.from({ length: 11 }, (_, index) => String(index - 5))

type SortKey = (typeof SORT_OPTIONS)[number]["value"]
type FilterOption = {
  value: string
  label: string
}

function FilterDropdown({
  title,
  value,
  onChange,
  options,
  className = "",
}: {
  title: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  className?: string
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "Select"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={[
          "inline-flex h-10 w-full items-center justify-between rounded-lg bg-[#f5f7fc] px-3 text-sm font-medium text-[#2f3f61]",
          "ring-1 ring-inset ring-[#d8dbe1] transition-colors hover:bg-[#eef3fb] hover:text-[#203050]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fb4d9]",
          className,
        ].join(" ")}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-[#6b7890]" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        sideOffset={6}
        className="w-[var(--anchor-width)] min-w-[220px] rounded-xl border border-[#cfd5df] bg-white/98 p-1.5 text-[#1f2734] shadow-[0_14px_32px_-20px_rgba(15,23,42,0.65)]"
      >
        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]">
          {title}
        </div>
        <DropdownMenuSeparator className="mx-1 my-1 bg-[#d8dbe1]" />
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(String(next))}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={`${title}-${option.value}`}
              value={option.value}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-[#2a354b] focus:bg-[#e8effd] focus:text-[#1f2f4e]"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MultiSelectDropdown({
  title,
  placeholder,
  countPrefix,
  selectedValues,
  onChange,
  options,
  className = "",
}: {
  title: string
  placeholder: string
  countPrefix?: string
  selectedValues: string[]
  onChange: (next: string[]) => void
  options: FilterOption[]
  className?: string
}) {
  const label = (() => {
    if (selectedValues.length === 0) return placeholder
    if (selectedValues.length === 1) {
      const found = options.find((option) => option.value === selectedValues[0])
      return found?.label ?? selectedValues[0]
    }
    return `${countPrefix ?? placeholder}: ${selectedValues.length}`
  })()

  const toggleValue = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...selectedValues, value])])
      return
    }
    onChange(selectedValues.filter((item) => item !== value))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={[
          "inline-flex h-10 w-full items-center justify-between rounded-lg bg-[#f5f7fc] px-3 text-sm font-medium text-[#2f3f61]",
          "ring-1 ring-inset ring-[#d8dbe1] transition-colors hover:bg-[#eef3fb] hover:text-[#203050]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fb4d9]",
          className,
        ].join(" ")}
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-[#6b7890]" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        sideOffset={6}
        className="w-[var(--anchor-width)] min-w-[220px] max-h-72 overflow-y-auto rounded-xl border border-[#cfd5df] bg-white/98 p-1.5 text-[#1f2734] shadow-[0_14px_32px_-20px_rgba(15,23,42,0.65)]"
      >
        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]">
          {title}
        </div>
        <DropdownMenuSeparator className="mx-1 my-1 bg-[#d8dbe1]" />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={`${title}-${option.value}`}
            checked={selectedValues.includes(option.value)}
            onCheckedChange={(checked) => toggleValue(option.value, Boolean(checked))}
            onSelect={(event) => event.preventDefault()}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-[#2a354b] focus:bg-[#e8effd] focus:text-[#1f2f4e]"
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RangeDropdown({
  title,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  onClear,
}: {
  title: string
  minLabel: string
  maxLabel: string
  minValue: string
  maxValue: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const summary = (() => {
    if (!minValue && !maxValue) return `${title}: any`
    if (minValue && maxValue) return `${title}: ${minValue} - ${maxValue}`
    if (minValue) return `${title}: from ${minValue}`
    return `${title}: to ${maxValue}`
  })()

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-full items-center justify-between rounded-lg bg-[#f5f7fc] px-3 text-sm font-medium text-[#2f3f61] ring-1 ring-inset ring-[#d8dbe1] transition-colors hover:bg-[#eef3fb] hover:text-[#203050] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fb4d9]"
      >
        <span className="truncate">{summary}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-[#6b7890]" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-1 min-w-[260px] rounded-xl border border-[#cfd5df] bg-white/98 p-2 text-[#1f2734] shadow-[0_14px_32px_-20px_rgba(15,23,42,0.65)]">
          <div className="px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]">
            {title}
          </div>
          <div className="mx-0.5 my-1 h-px bg-[#d8dbe1]" />
          <div className="grid gap-2">
            <input
              value={minValue}
              onChange={(event) => onMinChange(event.target.value)}
              inputMode="numeric"
              placeholder={minLabel}
              className="h-9 rounded-md border border-[#d8dbe1] bg-[#f5f7fc] px-2.5 text-sm text-[#2a3a58] outline-none placeholder:text-[#8a93a3]"
            />
            <input
              value={maxValue}
              onChange={(event) => onMaxChange(event.target.value)}
              inputMode="numeric"
              placeholder={maxLabel}
              className="h-9 rounded-md border border-[#d8dbe1] bg-[#f5f7fc] px-2.5 text-sm text-[#2a3a58] outline-none placeholder:text-[#8a93a3]"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d8dbe1] bg-[#f5f7fc] px-2.5 text-xs font-medium text-[#33435f] transition-colors hover:bg-[#edf2fb]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d8dbe1] bg-[#eef2fb] px-2.5 text-xs font-medium text-[#334f82] transition-colors hover:bg-[#e3ebfb]"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function formatNumber(value: number | null) {
  if (typeof value !== "number") return "—"
  return new Intl.NumberFormat("ru-RU").format(value)
}

function formatPosition(current: number | null, max: number | null) {
  const currentLabel = formatNumber(current)
  if (max === null) return currentLabel
  return `${currentLabel} (${formatNumber(max)})`
}

export default function PlayersSearchPage() {
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [sort, setSort] = useState<SortKey>("rating")
  const [selectedRanks, setSelectedRanks] = useState<string[]>([])
  const [ratingMinInput, setRatingMinInput] = useState("")
  const [ratingMaxInput, setRatingMaxInput] = useState("")
  const [prizeMinInput, setPrizeMinInput] = useState("")
  const [prizeMaxInput, setPrizeMaxInput] = useState("")
  const [masterMinInput, setMasterMinInput] = useState("")
  const [masterMaxInput, setMasterMaxInput] = useState("")
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<PlayerSearchRow[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1)
      setQuery(queryInput.trim())
    }, 280)
    return () => window.clearTimeout(timeoutId)
  }, [queryInput])

  useEffect(() => {
    let active = true

    async function loadPlayers() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.set("limit", String(PAGE_SIZE))
        params.set("page", String(page))
        if (query) params.set("q", query)
        if (selectedCities.length > 0) params.set("cities", selectedCities.join(","))
        if (sort !== "rating") params.set("sort", sort)
        if (selectedRanks.length > 0) params.set("ranks", selectedRanks.join(","))
        if (ratingMinInput.trim()) params.set("ratingMin", ratingMinInput.trim())
        if (ratingMaxInput.trim()) params.set("ratingMax", ratingMaxInput.trim())
        if (prizeMinInput.trim()) params.set("prizeMin", prizeMinInput.trim())
        if (prizeMaxInput.trim()) params.set("prizeMax", prizeMaxInput.trim())
        if (masterMinInput.trim()) params.set("masterMin", masterMinInput.trim())
        if (masterMaxInput.trim()) params.set("masterMax", masterMaxInput.trim())

        const response = await fetch(`/api/players/search?${params.toString()}`, {
          cache: "no-store",
        })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `HTTP ${response.status}`)
        }

        const payload = (await response.json()) as PlayerSearchResponse
        if (!active) return

        setRows(payload.rows ?? [])
        setCityOptions(payload.cities ?? [])
        setGeneratedAt(payload.generatedAt ?? null)
        setTotal(payload.total ?? 0)
        setTotalPages(payload.totalPages ?? 1)
        setPage(payload.page ?? 1)
        if (!payload.ready) {
          setError(payload.message ?? "Players data source is unavailable")
        }
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : "Failed to load players")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPlayers()

    return () => {
      active = false
    }
  }, [
    query,
    selectedCities,
    sort,
    selectedRanks,
    ratingMinInput,
    ratingMaxInput,
    prizeMinInput,
    prizeMaxInput,
    masterMinInput,
    masterMaxInput,
    page,
  ])

  const visiblePages = useMemo(() => {
    const windowSize = 5
    const start = Math.max(1, Math.min(page - 2, totalPages - windowSize + 1))
    const end = Math.min(totalPages, start + windowSize - 1)
    const pages: number[] = []
    for (let cursor = start; cursor <= end; cursor += 1) {
      pages.push(cursor)
    }
    return pages
  }, [page, totalPages])

  const updatedLabel = useMemo(() => {
    if (!generatedAt) return "—"
    const date = new Date(generatedAt)
    if (Number.isNaN(date.getTime())) return "—"
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }, [generatedAt])

  const hasAnyActiveFilter =
    Boolean(query) ||
    selectedCities.length > 0 ||
    selectedRanks.length > 0 ||
    sort !== "rating" ||
    Boolean(ratingMinInput || ratingMaxInput) ||
    Boolean(prizeMinInput || prizeMaxInput) ||
    Boolean(masterMinInput || masterMaxInput)

  const clearAllFilters = () => {
    setPage(1)
    setQueryInput("")
    setQuery("")
    setSelectedCities([])
    setSort("rating")
    setSelectedRanks([])
    setRatingMinInput("")
    setRatingMaxInput("")
    setPrizeMinInput("")
    setPrizeMaxInput("")
    setMasterMinInput("")
    setMasterMaxInput("")
  }

  return (
    <DashboardShellPage
      breadcrumbs={[
        { label: "Portal", href: "/dashboard" },
        { label: "Players", href: "/dashboard/players/ratings" },
        { label: "Search" },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#1f2734]">Player search</h1>
              <p className="mt-1 text-sm text-[#6e7788]">
                Search players by name, city, rank, bridge IDs, and nicknames from
                BridgeSport.
              </p>
            </div>
            <p className="text-xs font-medium text-[#7a8394]">Updated: {updatedLabel}</p>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_220px_220px]">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d8dbe1] bg-[#f5f7fc] px-3">
              <SearchIcon className="size-4 text-[#6e7788]" />
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Search by name, city, rank, BBO, Gambler, or ID"
                className="w-full bg-transparent text-sm text-[#1f2734] outline-none placeholder:text-[#8a93a3]"
              />
            </label>

            <MultiSelectDropdown
              title="City filter"
              placeholder="All cities"
              countPrefix="Cities"
              selectedValues={selectedCities}
              onChange={(next) => {
                setPage(1)
                setSelectedCities(next)
              }}
              options={cityOptions.map((option) => ({
                value: option,
                label: option,
              }))}
            />

            <FilterDropdown
              title="Sort by"
              value={sort}
              onChange={(next) => {
                setPage(1)
                setSort(next as SortKey)
              }}
              options={SORT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-[220px_1fr_1fr_1fr_auto]">
            <MultiSelectDropdown
              title="Rank filter"
              placeholder="Rank: all"
              countPrefix="Ranks"
              selectedValues={selectedRanks}
              onChange={(next) => {
                setPage(1)
                setSelectedRanks(next)
              }}
              options={[
                ...RANK_OPTIONS.map((value) => ({
                  value,
                  label: `Rank ${value}`,
                })),
              ]}
            />

            <RangeDropdown
              title="Rating range"
              minLabel="Rating min"
              maxLabel="Rating max"
              minValue={ratingMinInput}
              maxValue={ratingMaxInput}
              onMinChange={(value) => {
                setPage(1)
                setRatingMinInput(value)
              }}
              onMaxChange={(value) => {
                setPage(1)
                setRatingMaxInput(value)
              }}
              onClear={() => {
                setPage(1)
                setRatingMinInput("")
                setRatingMaxInput("")
              }}
            />

            <RangeDropdown
              title="ПБ range"
              minLabel="ПБ min"
              maxLabel="ПБ max"
              minValue={prizeMinInput}
              maxValue={prizeMaxInput}
              onMinChange={(value) => {
                setPage(1)
                setPrizeMinInput(value)
              }}
              onMaxChange={(value) => {
                setPage(1)
                setPrizeMaxInput(value)
              }}
              onClear={() => {
                setPage(1)
                setPrizeMinInput("")
                setPrizeMaxInput("")
              }}
            />

            <RangeDropdown
              title="МБ range"
              minLabel="МБ min"
              maxLabel="МБ max"
              minValue={masterMinInput}
              maxValue={masterMaxInput}
              onMinChange={(value) => {
                setPage(1)
                setMasterMinInput(value)
              }}
              onMaxChange={(value) => {
                setPage(1)
                setMasterMaxInput(value)
              }}
              onClear={() => {
                setPage(1)
                setMasterMinInput("")
                setMasterMaxInput("")
              }}
            />
            <button
              type="button"
              onClick={clearAllFilters}
              className="h-10 rounded-lg border border-[#9eb2da] bg-[#e8effd] px-3 text-sm font-semibold text-[#223659] shadow-sm transition-colors hover:border-[#89a2d2] hover:bg-[#dfe9fd]"
            >
              Reset filters
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6e7788]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf1ff] px-2.5 py-1 font-medium text-[#334f82]">
              <UsersIcon className="size-3.5" />
              Players: {formatNumber(total)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eef5eb] px-2.5 py-1 font-medium text-[#3f6a47]">
              <MapPinIcon className="size-3.5" />
              Cities: {cityOptions.length}
            </span>
            {query ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f7] px-2.5 py-1 font-medium text-[#5f6878]">
                Query: {query}
              </span>
            ) : null}
            {selectedRanks.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f7] px-2.5 py-1 font-medium text-[#5f6878]">
                Rank: {selectedRanks.join(", ")}
              </span>
            ) : null}
            {selectedCities.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f7] px-2.5 py-1 font-medium text-[#5f6878]">
                Cities: {selectedCities.length}
              </span>
            ) : null}
          </div>

          {hasAnyActiveFilter ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1)
                    setQueryInput("")
                    setQuery("")
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#eef2fb] px-2.5 text-xs font-medium text-[#334f82] hover:bg-[#e3ebfb]"
                >
                  Query: {query}
                  <XIcon className="size-3" />
                </button>
              ) : null}

              {sort !== "rating" ? (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1)
                    setSort("rating")
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#eef2fb] px-2.5 text-xs font-medium text-[#334f82] hover:bg-[#e3ebfb]"
                >
                  {SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort}
                  <XIcon className="size-3" />
                </button>
              ) : null}

              {selectedCities.map((city) => (
                <button
                  key={`chip-city-${city}`}
                  type="button"
                  onClick={() => {
                    setPage(1)
                    setSelectedCities((prev) => prev.filter((item) => item !== city))
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#eef5eb] px-2.5 text-xs font-medium text-[#3f6a47] hover:bg-[#e4f0df]"
                >
                  {city}
                  <XIcon className="size-3" />
                </button>
              ))}

              {selectedRanks.map((rank) => (
                <button
                  key={`chip-rank-${rank}`}
                  type="button"
                  onClick={() => {
                    setPage(1)
                    setSelectedRanks((prev) => prev.filter((item) => item !== rank))
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#f3f4f7] px-2.5 text-xs font-medium text-[#5f6878] hover:bg-[#e8ebf1]"
                >
                  Rank {rank}
                  <XIcon className="size-3" />
                </button>
              ))}

              {ratingMinInput || ratingMaxInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1)
                    setRatingMinInput("")
                    setRatingMaxInput("")
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#ebf1ff] px-2.5 text-xs font-medium text-[#334f82] hover:bg-[#e3ebfb]"
                >
                  Rating: {ratingMinInput || "any"} - {ratingMaxInput || "any"}
                  <XIcon className="size-3" />
                </button>
              ) : null}

              {prizeMinInput || prizeMaxInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1)
                    setPrizeMinInput("")
                    setPrizeMaxInput("")
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#eef3ff] px-2.5 text-xs font-medium text-[#3e5687] hover:bg-[#e5edff]"
                >
                  ПБ: {prizeMinInput || "any"} - {prizeMaxInput || "any"}
                  <XIcon className="size-3" />
                </button>
              ) : null}

              {masterMinInput || masterMaxInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setPage(1)
                    setMasterMinInput("")
                    setMasterMaxInput("")
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#eff6f1] px-2.5 text-xs font-medium text-[#426a52] hover:bg-[#e4f1e8]"
                >
                  МБ: {masterMinInput || "any"} - {masterMaxInput || "any"}
                  <XIcon className="size-3" />
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {error ? (
          <section className="rounded-xl border border-[#e7c3c3] bg-[#fff5f5] p-4 text-sm text-[#8d2f2f]">
            <div className="flex items-start gap-2">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <p>Failed to load players: {error}</p>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-[#d8dbe1] bg-white p-4 shadow-sm">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`player-skeleton-${index}`}
                  className="space-y-2 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3"
                >
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[#e4e8f0]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[#e9edf4]" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-[#e9edf4]" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d8dbe1] bg-[#f8f9fc] p-6 text-center">
              <p className="text-lg font-semibold text-[#24314a]">No players found</p>
              <p className="mt-1 text-sm text-[#6e7788]">
                Try another query or clear city filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((player) => {
                const playerHref = `/dashboard/players/${encodeURIComponent(player.id)}`
                return (
                  <article
                    key={player.id}
                    className="rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={playerHref}
                          className="text-sm font-semibold text-[#1f2734] transition-colors hover:text-[#2d4a78] hover:underline"
                          title="Open player card and tournament history"
                        >
                          {player.name}
                        </Link>
                        <p className="text-xs text-[#6e7788]">ID: {player.sourcePlayerId}</p>
                      </div>
                      {player.profileUrl ? (
                        <a
                          href={player.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open BridgeSport profile"
                          className="inline-flex size-7 items-center justify-center rounded-md border border-[#d3d9e5] bg-white text-[#4b5f86] transition-colors hover:bg-[#edf2fb]"
                        >
                          <ExternalLinkIcon className="size-3.5" />
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf1ff] px-2 py-0.5 text-[11px] font-medium text-[#334f82]">
                        <StarIcon className="size-3" />
                        Rating: {formatNumber(player.rating)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#eef5eb] px-2 py-0.5 text-[11px] font-medium text-[#3f6a47]">
                        <TrophyIcon className="size-3" />
                        Pos: {formatPosition(player.ratingPosition, player.maxRatingPosition)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3ff] px-2 py-0.5 text-[11px] font-medium text-[#3e5687]">
                        ПБ: {formatNumber(player.prizePoints)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#eff6f1] px-2 py-0.5 text-[11px] font-medium text-[#426a52]">
                        МБ: {formatNumber(player.masterPoints)}
                      </span>
                      <Link
                        href={playerHref}
                        className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f7] px-2 py-0.5 text-[11px] font-medium text-[#48536b] transition-colors hover:bg-[#e8ecf4] hover:text-[#2c3447]"
                        title="Open player card and tournament history"
                      >
                        <UsersIcon className="size-3" />
                        Tournaments: {formatNumber(player.tournamentsCount)}
                      </Link>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-[#5f6878]">
                      {player.city ? (
                        <p className="inline-flex items-center gap-1">
                          <MapPinIcon className="size-3.5" />
                          {player.city}
                        </p>
                      ) : null}
                      {player.rank ? (
                        <p className="inline-flex items-center gap-1">
                          <ShieldUserIcon className="size-3.5" />
                          Rank: {player.rank}
                        </p>
                      ) : null}
                      {player.club ? <p>Club: {player.club}</p> : null}
                      {player.bboNick ? <p>BBO: {player.bboNick}</p> : null}
                      {player.gamblerNick ? <p>Gambler: {player.gamblerNick}</p> : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!loading && totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e0e4ec] pt-3">
              <p className="text-xs text-[#6e7788]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs font-medium text-[#2e3d5b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeftIcon className="size-3.5" />
                  Prev
                </button>
                {visiblePages.map((value) => (
                  <button
                    key={`page-${value}`}
                    type="button"
                    onClick={() => setPage(value)}
                    className={[
                      "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors",
                      value === page
                        ? "border-[#9eb2da] bg-[#e8effd] text-[#223659]"
                        : "border-[#d8dbe1] bg-[#f8f9fc] text-[#4b5974] hover:bg-[#edf2fb]",
                    ].join(" ")}
                  >
                    {value}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs font-medium text-[#2e3d5b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRightIcon className="size-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </DashboardShellPage>
  )
}
