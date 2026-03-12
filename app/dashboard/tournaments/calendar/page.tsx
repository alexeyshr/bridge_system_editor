"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  Clock3Icon,
  MapPinIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFaviconToggle } from "@/components/dashboard-favicon-toggle"
import { TopbarGuestWelcome } from "@/components/topbar-guest-welcome"
import { TopbarGlobalSearch } from "@/components/topbar-global-search"
import { TopbarNotifications } from "@/components/topbar-notifications"
import { TopbarSuitIcons } from "@/components/topbar-suit-icons"
import { TopbarUserMenu } from "@/components/topbar-user-menu"
import {
  normalizePortalRoles,
  type PortalRole,
} from "@/lib/portal-access"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type CalendarTournamentRow = {
  id: string
  sourceTournamentId: number
  name: string
  city: string | null
  dateLabel: string | null
  monthLabel: string | null
  tournamentCategory: string | null
  tournamentType: string | null
  tournamentFormat: string | null
  registrationOpen: boolean
  registeredCount: number | null
  participantsCount: number
  sourceUrl: string | null
  startDate: string
}

type CalendarResponse = {
  ready: boolean
  generatedAt: string
  total: number
  rows: CalendarTournamentRow[]
  message?: string
}

type CalendarMonthGroup = {
  key: string
  label: string
  items: CalendarTournamentRow[]
}

type RegistrationFilter = "all" | "open" | "closed"
type FilterOption = {
  value: string
  label: string
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) return dateIso
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatMonth(dateIso: string) {
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) return "Без месяца"
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date)
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
          "inline-flex h-9 w-full items-center justify-between rounded-lg bg-[#f5f7fc] px-3 text-sm font-medium text-[#2f3f61]",
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

export default function TournamentsCalendarPage() {
  const { data: session, status } = useSession()
  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status !== "authenticated"

  const currentUser = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  const [rows, setRows] = useState<CalendarTournamentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [cityFilter, setCityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>("all")
  const [collapsedMonths, setCollapsedMonths] = useState<string[]>([])

  useEffect(() => {
    let mounted = true

    async function loadCalendar() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/tournaments/calendar?limit=240", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const payload = (await response.json()) as CalendarResponse
        if (!mounted) return

        setRows(payload.rows ?? [])
        setGeneratedAt(payload.generatedAt ?? null)
        if (!payload.ready) {
          setError(payload.message ?? "Calendar data source is unavailable")
        }
      } catch (requestError) {
        if (!mounted) return
        setError(requestError instanceof Error ? requestError.message : "Failed to load calendar")
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadCalendar()
    return () => {
      mounted = false
    }
  }, [])

  const availableCities = useMemo(() => {
    const cities = Array.from(
      new Set(
        rows
          .map((item) => item.city?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    )
    return cities.sort((a, b) => a.localeCompare(b, "ru"))
  }, [rows])

  const availableTypes = useMemo(() => {
    const types = Array.from(
      new Set(
        rows
          .map((item) => item.tournamentType?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    )
    return types.sort((a, b) => a.localeCompare(b, "ru"))
  }, [rows])

  const normalizedQuery = query.trim().toLowerCase()
  const cityOptions = useMemo<FilterOption[]>(
    () => [
      { value: "all", label: "All cities" },
      ...availableCities.map((city) => ({ value: city, label: city })),
    ],
    [availableCities],
  )
  const typeOptions = useMemo<FilterOption[]>(
    () => [
      { value: "all", label: "All types" },
      ...availableTypes.map((type) => ({ value: type, label: type })),
    ],
    [availableTypes],
  )
  const registrationOptions = useMemo<FilterOption[]>(
    () => [
      { value: "all", label: "Registration: all" },
      { value: "open", label: "Registration: open" },
      { value: "closed", label: "Registration: closed" },
    ],
    [],
  )
  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (cityFilter !== "all" && item.city !== cityFilter) {
        return false
      }

      if (typeFilter !== "all" && item.tournamentType !== typeFilter) {
        return false
      }

      if (registrationFilter === "open" && !item.registrationOpen) {
        return false
      }
      if (registrationFilter === "closed" && item.registrationOpen) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const haystack = [
        item.name,
        item.city,
        item.tournamentCategory,
        item.tournamentType,
        item.tournamentFormat,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [rows, cityFilter, typeFilter, registrationFilter, normalizedQuery])

  const monthGroups = useMemo<CalendarMonthGroup[]>(() => {
    const grouped = new Map<string, CalendarMonthGroup>()

    for (const item of filteredRows) {
      const fallbackLabel = formatMonth(item.startDate)
      const label = item.monthLabel?.trim() || fallbackLabel
      const key = `${label}|${fallbackLabel}`

      const existing = grouped.get(key)
      if (existing) {
        existing.items.push(item)
      } else {
        grouped.set(key, {
          key,
          label,
          items: [item],
        })
      }
    }

    return Array.from(grouped.values())
  }, [filteredRows])

  useEffect(() => {
    setCollapsedMonths((previous) =>
      previous.filter((key) => monthGroups.some((group) => group.key === key)),
    )
  }, [monthGroups])

  const stats = useMemo(() => {
    const registrationOpen = filteredRows.filter((item) => item.registrationOpen).length
    const cities = new Set(filteredRows.map((item) => item.city).filter(Boolean)).size

    return {
      total: filteredRows.length,
      registrationOpen,
      cities,
      nearestDate: filteredRows[0]?.startDate ?? null,
    }
  }, [filteredRows])

  const hasActiveFilters =
    normalizedQuery.length > 0 ||
    cityFilter !== "all" ||
    typeFilter !== "all" ||
    registrationFilter !== "all"

  const updatedLabel = useMemo(() => {
    if (!generatedAt) return null
    return formatDate(generatedAt)
  }, [generatedAt])

  function clearFilters() {
    setQuery("")
    setCityFilter("all")
    setTypeFilter("all")
    setRegistrationFilter("all")
  }

  function toggleMonth(monthKey: string) {
    setCollapsedMonths((previous) =>
      previous.includes(monthKey)
        ? previous.filter((key) => key !== monthKey)
        : [...previous, monthKey],
    )
  }

  function collapseAllMonths() {
    setCollapsedMonths(monthGroups.map((group) => group.key))
  }

  function expandAllMonths() {
    setCollapsedMonths([])
  }

  return (
    <SidebarProvider>
      <AppSidebar visualVariant="dense" roles={roles} />
      <SidebarInset className="h-svh overflow-hidden bg-[#f6f7fb]">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[#d8dbe1] bg-[#f6f7fb]/95 px-4 backdrop-blur relative">
          <div className="flex items-center gap-2">
            <DashboardFaviconToggle />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto [&[data-slot=separator]]:bg-[#cfd5df]"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard" className="text-[#6e7788]">
                    Portal
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/tournaments/calendar" className="text-[#6e7788]">
                    Tournaments
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[#1f2734]">Calendar</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {isGuest ? (
            <TopbarGuestWelcome className="absolute left-1/2 hidden -translate-x-1/2 lg:inline-flex" />
          ) : (
            <TopbarSuitIcons className="absolute left-1/2 hidden -translate-x-1/2 md:inline-flex" />
          )}

          <div className="ml-auto flex items-center gap-2">
            <TopbarGlobalSearch className="hidden sm:flex" />
            {!isGuest ? <TopbarNotifications /> : null}
            <TopbarUserMenu user={currentUser} isGuest={isGuest} />
          </div>
        </header>

        <main className="relative flex-1 overflow-auto p-3 md:p-4">
          <div className="mx-auto w-full max-w-[1320px] space-y-3">
            <section className="sticky top-2 z-30 rounded-xl border border-[#d8dbe1] bg-white/92 p-4 shadow-sm backdrop-blur-sm">
              <div className="grid gap-3 xl:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
                <div className="space-y-2">
                  <div className="flex min-w-[220px] items-start gap-2.5">
                    <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-full border border-[#d8dbe1] bg-[#f4f7fd] text-[#2f3f61]">
                      <CalendarDaysIcon className="size-4.5" />
                    </span>
                    <div>
                      <h1 className="text-xl font-semibold text-[#1f2734]">Tournament Calendar</h1>
                      <p className="mt-0.5 text-sm text-[#5f6d83]">
                        Upcoming events from BridgeSport calendar.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#7b8597]">
                    {updatedLabel ? <p>Updated: {updatedLabel}</p> : null}
                    {hasActiveFilters ? (
                      <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[#395379]">Filtered view</span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2 xl:pl-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[#33425f]">
                      <SlidersHorizontalIcon className="size-4" />
                      Filters
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={expandAllMonths}
                        className="rounded-md bg-[#edf2fb] px-2 py-1 text-xs font-medium text-[#30476f] transition-colors hover:bg-[#e2ebfa]"
                      >
                        Expand months
                      </button>
                      <button
                        type="button"
                        onClick={collapseAllMonths}
                        className="rounded-md bg-[#eef1f6] px-2 py-1 text-xs font-medium text-[#4a5b76] transition-colors hover:bg-[#e5e9f1]"
                      >
                        Collapse months
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.7fr)_1fr_1fr_1fr_auto]">
                    <label className="relative block">
                      <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[#6f7b91]" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by tournament, city, format..."
                        className="h-9 w-full rounded-md border border-[#d8dbe1] bg-[#f8f9fc] pl-7 pr-2 text-sm text-[#1f2734] outline-none transition-colors placeholder:text-[#7f899b] focus:border-[#9db2d7] focus:bg-white"
                      />
                    </label>

                    <FilterDropdown
                      title="City"
                      value={cityFilter}
                      onChange={setCityFilter}
                      options={cityOptions}
                    />

                    <FilterDropdown
                      title="Tournament type"
                      value={typeFilter}
                      onChange={setTypeFilter}
                      options={typeOptions}
                    />

                    <FilterDropdown
                      title="Registration"
                      value={registrationFilter}
                      onChange={(value) => setRegistrationFilter(value as RegistrationFilter)}
                      options={registrationOptions}
                    />

                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#eef1f6] px-2.5 text-sm font-medium text-[#42516d] transition-colors hover:bg-[#e4e9f2] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RotateCcwIcon className="size-3.5" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e8effd] px-2.5 py-1 text-xs font-medium text-[#30476f]">
                  <CalendarDaysIcon className="size-3.5" />
                  Upcoming: {stats.total}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f7ef] px-2.5 py-1 text-xs font-medium text-[#256748]">
                  <SparklesIcon className="size-3.5" />
                  Open registration: {stats.registrationOpen}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1f6] px-2.5 py-1 text-xs font-medium text-[#4c5d79]">
                  <MapPinIcon className="size-3.5" />
                  Cities: {stats.cities}
                </span>
                {stats.nearestDate ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f3fb] px-2.5 py-1 text-xs font-medium text-[#314568]">
                    <Clock3Icon className="size-3.5" />
                    Nearest: {formatDate(stats.nearestDate)}
                  </span>
                ) : null}
              </div>
            </section>

            {loading ? (
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`calendar-skeleton-${index}`}
                    className="h-44 animate-pulse rounded-xl border border-[#d8dbe1] bg-white/70"
                  />
                ))}
              </section>
            ) : null}

            {error ? (
              <p className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5cad0] bg-[#fff2f4] px-2.5 py-1.5 text-sm text-[#8b3240]">
                <CircleAlertIcon className="size-4" />
                Failed to load calendar: {error}
              </p>
            ) : null}

            {!loading && rows.length === 0 ? (
              <section className="rounded-xl border border-dashed border-[#cfd5df] bg-white/80 p-6 text-center">
                <div className="mx-auto inline-flex size-10 items-center justify-center rounded-full border border-[#d8dbe1] bg-[#f4f7fd] text-[#2f3f61]">
                  <SparklesIcon className="size-5" />
                </div>
                <h2 className="mt-2 text-lg font-semibold text-[#1f2734]">No upcoming tournaments yet</h2>
                <p className="mt-1 text-sm text-[#5f6d83]">
                  Calendar is ready. As soon as events appear in BridgeSport, they will be shown here.
                </p>
              </section>
            ) : null}

            {!loading && rows.length > 0 && filteredRows.length === 0 ? (
              <section className="rounded-xl border border-dashed border-[#cfd5df] bg-white/80 p-6 text-center">
                <h2 className="text-lg font-semibold text-[#1f2734]">No tournaments match selected filters</h2>
                <p className="mt-1 text-sm text-[#5f6d83]">
                  Try changing city/type/registration filter or reset the search.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#e8effd] px-3 py-1.5 text-sm font-medium text-[#30476f] transition-colors hover:bg-[#dde8fb]"
                >
                  <RotateCcwIcon className="size-3.5" />
                  Reset filters
                </button>
              </section>
            ) : null}

            {!loading && filteredRows.length > 0 ? (
              <div className="space-y-3">
                {monthGroups.map((group) => (
                  <section key={group.key} className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleMonth(group.key)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg bg-[#f5f7fc] px-2.5 py-2 text-left transition-colors hover:bg-[#edf2fb]"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base font-semibold text-[#1f2734]">{group.label}</span>
                        <span className="rounded-full bg-[#e8effd] px-2 py-0.5 text-xs font-medium text-[#355892]">
                          {group.items.length} events
                        </span>
                      </span>
                      <span className="inline-flex size-6 items-center justify-center rounded-md bg-white text-[#5a6982]">
                        {collapsedMonths.includes(group.key) ? (
                          <ChevronDownIcon className="size-4" />
                        ) : (
                          <ChevronUpIcon className="size-4" />
                        )}
                      </span>
                    </button>

                    {!collapsedMonths.includes(group.key) ? (
                      <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((item) => (
                          <article
                            key={item.id}
                            className="group flex h-full flex-col rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3 transition-colors hover:bg-[#eef3fb]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-[15px] font-semibold text-[#1f2734]">{item.name}</p>
                              <p className="shrink-0 rounded-md border border-[#d8dbe1] bg-white px-1.5 py-0.5 text-[11px] text-[#5f6a7b]">
                                {item.dateLabel ?? formatDate(item.startDate)}
                              </p>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.tournamentType ? (
                                <span className="rounded-full border border-[#cfdbf1] bg-[#edf3ff] px-2 py-0.5 text-[11px] text-[#355892]">
                                  {item.tournamentType}
                                </span>
                              ) : null}
                              {item.tournamentCategory ? (
                                <span className="rounded-full border border-[#d8dbe1] bg-white px-2 py-0.5 text-[11px] text-[#5f6a7b]">
                                  {item.tournamentCategory}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 space-y-1.5 text-xs text-[#5f6d83]">
                            {item.city ? (
                              <p className="inline-flex items-center gap-1.5">
                                <MapPinIcon className="size-3.5 text-[#64748b]" />
                                {item.city}
                              </p>
                            ) : null}
                          </div>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#d8dbe1] pt-2">
                              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <span
                                  className={
                                    item.registrationOpen
                                      ? "rounded-full border border-[#b8e3cf] bg-[#ebfaf2] px-2 py-0.5 text-[11px] font-medium text-[#22754d]"
                                      : "rounded-full border border-[#e2d1d6] bg-[#fff4f6] px-2 py-0.5 text-[11px] font-medium text-[#8b3240]"
                                  }
                                >
                                  {item.registrationOpen ? "Registration open" : "Registration closed"}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#6f7a8d]">
                                  <UsersIcon className="size-3.5" />
                                  {item.registeredCount ?? item.participantsCount}
                                </span>
                              </div>

                              {item.sourceUrl ? (
                                <a
                                  href={item.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#cfd8ea] bg-white px-2 py-1 text-xs font-medium text-[#355892] transition-colors hover:bg-[#ecf2ff]"
                                >
                                  Open
                                  <ArrowUpRightIcon className="size-3.5 transition-transform group-hover:-translate-y-[1px] group-hover:translate-x-[1px]" />
                                </a>
                              ) : null}
                            </div>

                          {item.tournamentFormat ? (
                            <p className="mt-1 line-clamp-1 text-[11px] text-[#6f7a8d]">
                              Format: {item.tournamentFormat}
                              </p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
