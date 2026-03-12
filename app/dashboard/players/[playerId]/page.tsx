"use client"

import { type ComponentType, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  CalendarDaysIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CircleHelpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  LineChartIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  SearchXIcon,
  ShieldUserIcon,
  StarIcon,
  Table2Icon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { DashboardShellPage } from "@/components/dashboard-shell-page"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type PlayerCard = {
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
  tournamentsCount: number
  profileUrl: string | null
  gamblerNick: string | null
  bboNick: string | null
  club: string | null
}

type PlayerTournamentRow = {
  sourcePlayerId: number
  playerName: string | null
  year: number | null
  masterPoints: number | null
  prizePoints: number | null
  ratingPoints: string | null
  place: string | null
  partnerTeam: string | null
  tournament: string
}

type TournamentSort = "year" | "masterPoints" | "prizePoints" | "place" | "ratingPoints"
type TournamentSortDirection = "asc" | "desc"
type PlayerInsightsTab = "overview" | "dynamics" | "table"
type DynamicsMetric = "ratingPoints" | "masterPoints" | "prizePoints" | "avgPlace"
type InsightModal = "overview" | "dynamics" | null

type PlayerTournamentsResponse = {
  ready: boolean
  generatedAt: string
  player: PlayerCard
  years: number[]
  sort: TournamentSort
  direction: TournamentSortDirection
  year: number | null
  page: number
  pageSize: number
  total: number
  totalPages: number
  rows: PlayerTournamentRow[]
}

const PAGE_SIZE = 30
const DYNAMICS_CHART_WIDTH = 1000
const DYNAMICS_CHART_HEIGHT = 250
const SPARKLINE_CHART_WIDTH = 360
const SPARKLINE_CHART_HEIGHT = 44

const DEFAULT_TOURNAMENT_SORT_DIRECTION: Record<TournamentSort, TournamentSortDirection> = {
  year: "desc",
  masterPoints: "desc",
  prizePoints: "desc",
  place: "asc",
  ratingPoints: "desc",
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

function formatOneDecimal(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function parseNumericText(value: string | null): number | null {
  if (!value) return null
  const normalized = value.replace(/[^\d-]+/g, "")
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parsePlaceNumber(value: string | null): number | null {
  if (!value) return null
  const matched = value.match(/\d+/)
  if (!matched) return null
  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : null
}

type YearAggregate = {
  year: number
  tournaments: number
  masterPoints: number
  prizePoints: number
  ratingPoints: number
  avgPlace: number | null
}

type SparkPoint = { x: number; y: number }

function buildSparkPoints(values: number[], width: number, height: number, invert = false): SparkPoint[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerWidth = width - 8
  const innerHeight = height - 8
  const denom = Math.max(values.length - 1, 1)

  return values.map((value, index) => {
    const normalized = (value - min) / range
    const projected = invert ? 1 - normalized : normalized
    return {
      x: 4 + (index / denom) * innerWidth,
      y: 4 + (1 - projected) * innerHeight,
    }
  })
}

function toLinePath(points: SparkPoint[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ")
}

function toAreaPath(points: SparkPoint[], baselineY: number) {
  if (points.length < 2) return ""
  const line = toLinePath(points)
  return `${line} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`
}

type DynamicsPlotPoint = {
  x: number
  y: number
  label: string
  value: number
}

function buildDynamicsPlotPoints(
  values: { label: string; value: number }[],
  width: number,
  height: number,
  invert: boolean,
) {
  const left = 10
  const right = 10
  const top = 10
  const bottom = 14
  const innerWidth = width - left - right
  const innerHeight = height - top - bottom

  if (values.length === 0) {
    return {
      points: [] as DynamicsPlotPoint[],
      min: null as number | null,
      max: null as number | null,
      baselineY: height - bottom,
    }
  }

  const onlyValues = values.map((entry) => entry.value)
  const min = Math.min(...onlyValues)
  const max = Math.max(...onlyValues)
  const range = max - min || 1
  const denominator = Math.max(values.length - 1, 1)

  const points = values.map((entry, index) => {
    const x = values.length === 1 ? left + innerWidth / 2 : left + (index / denominator) * innerWidth
    const normalized = (entry.value - min) / range
    const projected = invert ? 1 - normalized : normalized

    return {
      x,
      y: top + (1 - projected) * innerHeight,
      label: entry.label,
      value: entry.value,
    }
  })

  return {
    points,
    min,
    max,
    baselineY: height - bottom,
  }
}

function polylineLength(points: SparkPoint[]) {
  if (points.length < 2) return 0
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const next = points[index]
    total += Math.hypot(next.x - prev.x, next.y - prev.y)
  }
  return total
}

function formatDynamicsValue(metric: DynamicsMetric, value: number | null) {
  if (value === null) return "—"
  if (metric === "avgPlace") return formatOneDecimal(value)
  return formatNumber(Math.round(value))
}

function Sparkline({
  values,
  className,
  strokeClassName,
  dotClassName,
  invert = false,
}: {
  values: number[]
  className?: string
  strokeClassName?: string
  dotClassName?: string
  invert?: boolean
}) {
  const baselineY = SPARKLINE_CHART_HEIGHT - 4
  const points = useMemo(
    () => buildSparkPoints(values, SPARKLINE_CHART_WIDTH, SPARKLINE_CHART_HEIGHT, invert),
    [values, invert],
  )
  const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ")
  const areaData =
    points.length >= 2
      ? `${pathData} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`
      : ""
  const lastPoint = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${SPARKLINE_CHART_WIDTH} ${SPARKLINE_CHART_HEIGHT}`}
      className={className ?? "block h-12 w-full"}
      aria-hidden
    >
      <path
        d={`M4 ${baselineY} H${SPARKLINE_CHART_WIDTH - 4}`}
        className="stroke-[#dbe3f1]"
        strokeWidth="1"
        fill="none"
      />
      {areaData ? <path d={areaData} className="fill-[#d9e8ff]/50" /> : null}
      {pathData ? (
        <path
          d={pathData}
          className={strokeClassName ?? "stroke-[#3e5f96]"}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {lastPoint ? <circle cx={lastPoint.x} cy={lastPoint.y} r="2.6" className={dotClassName ?? "fill-[#3e5f96]"} /> : null}
    </svg>
  )
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors",
        active
          ? "bg-[#e6edfb] text-[#2b4577] shadow-[inset_0_0_0_1px_#cfdaef]"
          : "text-[#64718a] hover:bg-[#eff3fb] hover:text-[#304a78]",
      ].join(" ")}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

function TableValueTooltip({ value }: { value: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="block w-full truncate whitespace-nowrap rounded-sm border-0 bg-transparent px-0 py-0 text-left outline-none transition-colors hover:text-[#223658] focus-visible:ring-2 focus-visible:ring-[#9bb0d7]/70"
      >
        {value}
      </TooltipTrigger>
      <TooltipContent
        align="start"
        sideOffset={8}
        className="max-w-[48rem] rounded-xl border border-[#d2dbe9] bg-[#f8faff] px-3 py-2 text-[12px] font-medium leading-5 text-[#24324b] shadow-[0_14px_30px_-18px_rgba(31,49,83,0.6)]"
      >
        <span className="whitespace-pre-wrap break-words">{value}</span>
      </TooltipContent>
    </Tooltip>
  )
}

export default function PlayerDetailsPage() {
  const params = useParams<{ playerId: string }>()
  const playerId = params?.playerId ?? ""

  const [player, setPlayer] = useState<PlayerCard | null>(null)
  const [rows, setRows] = useState<PlayerTournamentRow[]>([])
  const [years, setYears] = useState<number[]>([])
  const [selectedYears, setSelectedYears] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<TournamentSort>("year")
  const [sortDirection, setSortDirection] = useState<TournamentSortDirection>(
    DEFAULT_TOURNAMENT_SORT_DIRECTION.year,
  )
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insightsTab, setInsightsTab] = useState<PlayerInsightsTab>("overview")
  const [insightModal, setInsightModal] = useState<InsightModal>(null)
  const [analyticsRows, setAnalyticsRows] = useState<PlayerTournamentRow[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [dynamicsMetric, setDynamicsMetric] = useState<DynamicsMetric>("ratingPoints")

  useEffect(() => {
    if (!playerId) return
    let active = true

    async function loadPlayer() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          page: String(page),
          sort: sortBy,
          direction: sortDirection,
        })
        if (selectedYears.length > 0) params.set("years", selectedYears.join(","))

        const response = await fetch(
          `/api/players/${encodeURIComponent(playerId)}/tournaments?${params.toString()}`,
          { cache: "no-store" },
        )
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `HTTP ${response.status}`)
        }

        const payload = (await response.json()) as PlayerTournamentsResponse
        if (!active) return

        setPlayer(payload.player ?? null)
        setRows(payload.rows ?? [])
        setYears(payload.years ?? [])
        setPage(payload.page ?? 1)
        setTotal(payload.total ?? 0)
        setTotalPages(payload.totalPages ?? 1)
        setGeneratedAt(payload.generatedAt ?? null)
      } catch (requestError) {
        if (!active) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load player profile",
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPlayer()
    return () => {
      active = false
    }
  }, [playerId, page, selectedYears, sortBy, sortDirection])

  useEffect(() => {
    if (!playerId) return
    let active = true

    async function loadAnalyticsRows() {
      setAnalyticsLoading(true)
      setAnalyticsError(null)

      try {
        const collected: PlayerTournamentRow[] = []
        let nextPage = 1
        let totalPagesForAnalytics = 1

        while (nextPage <= totalPagesForAnalytics) {
          const params = new URLSearchParams({
            limit: "100",
            page: String(nextPage),
            sort: "year",
            direction: "desc",
          })
          if (selectedYears.length > 0) params.set("years", selectedYears.join(","))

          const response = await fetch(
            `/api/players/${encodeURIComponent(playerId)}/tournaments?${params.toString()}`,
            { cache: "no-store" },
          )
          if (!response.ok) {
            const text = await response.text()
            throw new Error(text || `HTTP ${response.status}`)
          }

          const payload = (await response.json()) as PlayerTournamentsResponse
          totalPagesForAnalytics = payload.totalPages ?? 1
          collected.push(...(payload.rows ?? []))
          nextPage += 1
        }

        if (!active) return
        setAnalyticsRows(collected)
      } catch (requestError) {
        if (!active) return
        setAnalyticsRows([])
        setAnalyticsError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load visualization data",
        )
      } finally {
        if (active) setAnalyticsLoading(false)
      }
    }

    void loadAnalyticsRows()
    return () => {
      active = false
    }
  }, [playerId, selectedYears])

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

  const yearAggregates = useMemo<YearAggregate[]>(() => {
    const grouped = new Map<
      number,
      {
        tournaments: number
        masterPoints: number
        prizePoints: number
        ratingPoints: number
        placeSum: number
        placeCount: number
      }
    >()

    for (const row of analyticsRows) {
      if (typeof row.year !== "number") continue
      const current = grouped.get(row.year) ?? {
        tournaments: 0,
        masterPoints: 0,
        prizePoints: 0,
        ratingPoints: 0,
        placeSum: 0,
        placeCount: 0,
      }
      current.tournaments += 1
      current.masterPoints += row.masterPoints ?? 0
      current.prizePoints += row.prizePoints ?? 0
      current.ratingPoints += parseNumericText(row.ratingPoints) ?? 0
      const place = parsePlaceNumber(row.place)
      if (place !== null) {
        current.placeSum += place
        current.placeCount += 1
      }
      grouped.set(row.year, current)
    }

    return Array.from(grouped.entries())
      .map(([year, entry]) => ({
        year,
        tournaments: entry.tournaments,
        masterPoints: entry.masterPoints,
        prizePoints: entry.prizePoints,
        ratingPoints: entry.ratingPoints,
        avgPlace: entry.placeCount > 0 ? entry.placeSum / entry.placeCount : null,
      }))
      .sort((a, b) => a.year - b.year)
  }, [analyticsRows])

  const overviewStats = useMemo(() => {
    let totalRo = 0
    let totalMb = 0
    let totalPb = 0
    let placeSum = 0
    let placeCount = 0

    for (const row of analyticsRows) {
      totalRo += parseNumericText(row.ratingPoints) ?? 0
      totalMb += row.masterPoints ?? 0
      totalPb += row.prizePoints ?? 0
      const place = parsePlaceNumber(row.place)
      if (place !== null) {
        placeSum += place
        placeCount += 1
      }
    }

    return {
      totalRo,
      totalMb,
      totalPb,
      avgPlace: placeCount > 0 ? placeSum / placeCount : null,
      tournaments: analyticsRows.length,
    }
  }, [analyticsRows])

  const dynamicsSeries = useMemo(() => {
    const byMetric = yearAggregates
      .map((entry) => {
        const value =
          dynamicsMetric === "ratingPoints"
            ? entry.ratingPoints
            : dynamicsMetric === "masterPoints"
              ? entry.masterPoints
              : dynamicsMetric === "prizePoints"
                ? entry.prizePoints
                : entry.avgPlace

        return {
          label: String(entry.year),
          value,
        }
      })
      .filter((entry): entry is { label: string; value: number } => typeof entry.value === "number")
      .slice(-10)

    const settings =
      dynamicsMetric === "ratingPoints"
        ? { title: "РО by year (last 10 years)", invert: false, valueLabel: "РО" }
        : dynamicsMetric === "masterPoints"
          ? { title: "МБ by year (last 10 years)", invert: false, valueLabel: "МБ" }
          : dynamicsMetric === "prizePoints"
            ? { title: "ПБ by year (last 10 years)", invert: false, valueLabel: "ПБ" }
            : { title: "Average place by year (last 10 years)", invert: true, valueLabel: "Place" }

    return {
      ...settings,
      points: byMetric,
    }
  }, [dynamicsMetric, yearAggregates])

  const dynamicsPlot = useMemo(
    () =>
      buildDynamicsPlotPoints(
        dynamicsSeries.points,
        DYNAMICS_CHART_WIDTH,
        DYNAMICS_CHART_HEIGHT,
        dynamicsSeries.invert,
      ),
    [dynamicsSeries.points, dynamicsSeries.invert],
  )
  const dynamicsPlotPoints = dynamicsPlot.points
  const dynamicsLinePath = useMemo(() => toLinePath(dynamicsPlotPoints), [dynamicsPlotPoints])
  const dynamicsAreaPath = useMemo(
    () => toAreaPath(dynamicsPlotPoints, dynamicsPlot.baselineY),
    [dynamicsPlotPoints, dynamicsPlot.baselineY],
  )
  const dynamicsLineLength = useMemo(() => polylineLength(dynamicsPlotPoints), [dynamicsPlotPoints])
  const dynamicsMin = dynamicsPlot.min
  const dynamicsMax = dynamicsPlot.max
  const averagePlaceTrend = useMemo(
    () =>
      yearAggregates
        .map((entry) => entry.avgPlace)
        .filter((entry): entry is number => typeof entry === "number"),
    [yearAggregates],
  )

  const renderSortIcon = (column: TournamentSort) => {
    if (sortBy !== column) {
      return <ArrowUpDownIcon className="size-3.5 text-[#7f8aa0]" />
    }

    return sortDirection === "asc" ? (
      <ArrowUpIcon className="size-3.5 text-[#2d4a78]" />
    ) : (
      <ArrowDownIcon className="size-3.5 text-[#2d4a78]" />
    )
  }

  const sortableHeaderClass = (column: TournamentSort) =>
    [
      "sticky top-0 z-20 px-3 py-1.5 text-left text-[12px] font-semibold tracking-[0.01em] text-[#4c5a75] shadow-[inset_0_-1px_0_0_#e3e8f1] transition-colors",
      sortBy === column ? "bg-[#eaf0fd] text-[#2d4a78]" : "bg-[#f6f8fc]",
    ].join(" ")

  const setSortFromHeader = (nextSort: TournamentSort) => {
    setPage(1)
    if (sortBy === nextSort) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortBy(nextSort)
    setSortDirection(DEFAULT_TOURNAMENT_SORT_DIRECTION[nextSort])
  }

  const selectedYearLabel =
    selectedYears.length === 0
      ? "All years"
      : selectedYears.length <= 2
        ? selectedYears.join(", ")
        : `${selectedYears.length} years`
  const selectedYearChips = selectedYears.slice(0, 2)
  const selectedYearOverflow = Math.max(0, selectedYears.length - selectedYearChips.length)
  const selectedYearOverflowValues = selectedYears.slice(selectedYearChips.length)

  const toggleYearSelection = (year: string) => {
    setPage(1)
    setSelectedYears((previous) => {
      if (previous.includes(year)) {
        return previous.filter((entry) => entry !== year)
      }

      return [...previous, year].sort((left, right) => Number(right) - Number(left))
    })
  }

  const resetYearSelection = () => {
    setPage(1)
    setSelectedYears([])
  }

  const removeYearSelection = (year: string) => {
    setPage(1)
    setSelectedYears((previous) => previous.filter((entry) => entry !== year))
  }

  return (
    <DashboardShellPage
      breadcrumbs={[
        { label: "Portal", href: "/dashboard" },
        { label: "Players", href: "/dashboard/players/search" },
        { label: player?.name ?? "Player card" },
      ]}
      mainClassName="p-3 md:p-4"
    >
      <div className="mx-auto max-w-6xl space-y-4">
        {error ? (
          <section className="rounded-xl border border-[#e7c3c3] bg-[#fff5f5] p-4 text-sm text-[#8d2f2f]">
            <div className="flex items-start gap-2">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <p>Failed to load player card: {error}</p>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-[#d8dbe1] bg-white p-4 shadow-sm">
          {loading || !player ? (
            <div className="space-y-2">
              <div className="h-6 w-72 animate-pulse rounded bg-[#e4e8f0]" />
              <div className="h-4 w-44 animate-pulse rounded bg-[#e9edf4]" />
              <div className="h-10 w-full animate-pulse rounded bg-[#edf1f8]" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-semibold text-[#1f2734]">{player.name}</h1>
                  <p className="text-sm text-[#6e7788]">ID: {player.sourcePlayerId}</p>
                </div>
                {player.profileUrl ? (
                  <a
                    href={player.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-[#d3d9e5] bg-[#f8f9fc] text-[#4b5f86] transition-colors hover:bg-[#edf2fb]"
                    title="Open BridgeSport profile"
                  >
                    <ExternalLinkIcon className="size-4" />
                  </a>
                ) : null}
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#ebf1ff] px-2 text-[11.5px] font-semibold text-[#334f82]">
                  <StarIcon className="size-3" />
                  Rating: {formatNumber(player.rating)}
                </span>
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#eef5eb] px-2 text-[11.5px] font-semibold text-[#3f6a47]">
                  <TrophyIcon className="size-3" />
                  Pos: {formatPosition(player.ratingPosition, player.maxRatingPosition)}
                </span>
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#eef3ff] px-2 text-[11.5px] font-semibold text-[#3e5687]">
                  ПБ: {formatNumber(player.prizePoints)}
                </span>
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#eff6f1] px-2 text-[11.5px] font-semibold text-[#426a52]">
                  МБ: {formatNumber(player.masterPoints)}
                </span>
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#f3f4f7] px-2 text-[11.5px] font-semibold text-[#5f6878]">
                  <UsersIcon className="size-3" />
                  Tournaments: {formatNumber(player.tournamentsCount)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5f6878]">
                {player.city ? (
                  <p className="inline-flex items-center gap-1">
                    <MapPinIcon className="size-4" />
                    {player.city}
                  </p>
                ) : null}
                {player.rank ? (
                  <p className="inline-flex items-center gap-1">
                    <ShieldUserIcon className="size-4" />
                    Rank: {player.rank}
                  </p>
                ) : null}
                {player.club ? <p>Club: {player.club}</p> : null}
                {player.bboNick ? <p>BBO: {player.bboNick}</p> : null}
                {player.gamblerNick ? <p>Gambler: {player.gamblerNick}</p> : null}
              </div>

              <p className="mt-2 text-xs text-[#7a8394]">Updated: {updatedLabel}</p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-[#d8dbe1] bg-white p-0 shadow-sm">
          <div className="border-b border-[#e0e4ec] px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1f2734]">Performance explorer</h2>
                <p className="text-sm text-[#6e7788]">Trends and tournament table in one place.</p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="inline-flex rounded-xl border border-[#cfd8e8] bg-[#f8faff] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <TabButton
                    active={insightsTab === "overview"}
                    icon={LayoutDashboardIcon}
                    label="Overview"
                    onClick={() => setInsightsTab("overview")}
                  />
                  <TabButton
                    active={insightsTab === "dynamics"}
                    icon={LineChartIcon}
                    label="Dynamics"
                    onClick={() => setInsightsTab("dynamics")}
                  />
                  <TabButton
                    active={insightsTab === "table"}
                    icon={Table2Icon}
                    label="Table"
                    onClick={() => setInsightsTab("table")}
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-10 min-w-44 items-center justify-between gap-2 rounded-xl border border-[#cfd5df] bg-[#f5f7fc] px-3 text-sm font-semibold text-[#2f3f61] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] transition-colors hover:bg-[#eef3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fb4d9]">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <CalendarDaysIcon className="size-4 text-[#65758f]" />
                      {selectedYears.length === 0 ? (
                        <span>{selectedYearLabel}</span>
                      ) : (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          {selectedYearChips.map((year) => (
                            <button
                              type="button"
                              key={`year-chip-${year}`}
                              className="inline-flex h-6 items-center gap-1 rounded-md bg-[#e9effb] px-1.5 text-[11px] font-semibold text-[#2f4674] transition-colors hover:bg-[#dde8fc]"
                              onPointerDown={(event) => event.preventDefault()}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                removeYearSelection(year)
                              }}
                              aria-label={`Remove year ${year}`}
                            >
                              <span>{year}</span>
                              <XIcon className="size-3 text-[#6074a1]" />
                            </button>
                          ))}
                          {selectedYearOverflow > 0 ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span className="inline-flex h-6 items-center rounded-md bg-[#edf2fa] px-2 text-[11px] font-semibold text-[#59667d]">
                                    +{selectedYearOverflow}
                                  </span>
                                }
                              />
                              <TooltipContent
                                side="bottom"
                                sideOffset={8}
                                className="max-w-56 rounded-lg border border-[#d2dbe9] bg-[#f8faff] px-2.5 py-1.5 text-[11px] font-semibold text-[#24324b] shadow-[0_12px_28px_-18px_rgba(31,49,83,0.65)]"
                              >
                                Hidden years: {selectedYearOverflowValues.join(", ")}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </span>
                      )}
                    </span>
                    <ChevronDownIcon className="size-4 text-[#65758f]" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    sideOffset={6}
                    className="w-(--anchor-width) min-w-44 rounded-xl border border-[#cfd5df] bg-white/98 p-1.5 text-[#1f2734] shadow-[0_14px_32px_-20px_rgba(15,23,42,0.65)]"
                  >
                    <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]">
                      Years (multi-select)
                    </div>
                    <DropdownMenuSeparator className="mx-1 my-1 bg-[#d8dbe1]" />
                    <DropdownMenuItem
                      onClick={resetYearSelection}
                      onSelect={resetYearSelection}
                      className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-[#2a3d63] focus:bg-[#e8effd] focus:text-[#1f2f4e]"
                    >
                      All years
                      <span className="ml-auto text-xs text-[#6e7b93]">
                        {selectedYears.length === 0 ? "active" : "reset"}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mx-1 my-1 bg-[#d8dbe1]" />
                    {years.map((year) => {
                      const yearValue = String(year)
                      return (
                        <DropdownMenuCheckboxItem
                          key={`year-option-${year}`}
                          checked={selectedYears.includes(yearValue)}
                          onSelect={(event) => event.preventDefault()}
                          onCheckedChange={() => toggleYearSelection(yearValue)}
                          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-[#2a354b] focus:bg-[#e8effd] focus:text-[#1f2f4e]"
                        >
                          {year}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {insightsTab === "overview" ? (
            analyticsLoading ? (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                <div className="h-28 animate-pulse rounded-xl bg-[#eff3fa]" />
                <div className="h-28 animate-pulse rounded-xl bg-[#eff3fa]" />
                <div className="h-28 animate-pulse rounded-xl bg-[#eff3fa]" />
                <div className="h-28 animate-pulse rounded-xl bg-[#eff3fa]" />
              </div>
            ) : analyticsError ? (
              <div className="animate-in fade-in-0 slide-in-from-bottom-1 p-4 duration-300">
                <div className="rounded-xl border border-[#e7c3c3] bg-[#fff5f5] p-3 text-sm text-[#8d2f2f]">
                  Failed to load overview data: {analyticsError}
                </div>
              </div>
            ) : yearAggregates.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#f1f4fa] text-[#6e7788]">
                  <SearchXIcon className="size-5" />
                </div>
                <p className="mt-2 text-base font-medium text-[#2b3446]">No data for visualization</p>
                <p className="text-sm text-[#6e7788]">Try another year filter.</p>
              </div>
            ) : (
              <div className="animate-in fade-in-0 slide-in-from-bottom-1 p-4 duration-300">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm text-[#5f6e87]">
                    Compact metric cards with yearly trend lines.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInsightModal("overview")}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-[#d3dcea] bg-[#f7f9fd] text-[#5a6985] transition-colors hover:bg-[#ebf1fb] hover:text-[#334b78]"
                    aria-label="Overview chart description"
                  >
                    <CircleHelpIcon className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <article className="rounded-xl border border-[#d9e1f0] bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7ff_100%)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#627294]">РО total</p>
                    <p className="mt-1 text-2xl font-semibold text-[#1f345f]">
                      {formatNumber(overviewStats.totalRo)}
                    </p>
                    <Sparkline
                      values={yearAggregates.map((entry) => entry.ratingPoints)}
                      className="mt-1 block h-12 w-full"
                    />
                  </article>

                  <article className="rounded-xl border border-[#dce8dc] bg-[linear-gradient(180deg,#f8fdf9_0%,#f0f8f2_100%)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5f7a66]">МБ total</p>
                    <p className="mt-1 text-2xl font-semibold text-[#2f5940]">
                      {formatNumber(overviewStats.totalMb)}
                    </p>
                    <Sparkline
                      values={yearAggregates.map((entry) => entry.masterPoints)}
                      className="mt-1 block h-12 w-full"
                      strokeClassName="stroke-[#4f8a61]"
                      dotClassName="fill-[#4f8a61]"
                    />
                  </article>

                  <article className="rounded-xl border border-[#e5decc] bg-[linear-gradient(180deg,#fffcf6_0%,#f8f3e8_100%)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7b6b45]">ПБ total</p>
                    <p className="mt-1 text-2xl font-semibold text-[#5f4a22]">
                      {formatNumber(overviewStats.totalPb)}
                    </p>
                    <Sparkline
                      values={yearAggregates.map((entry) => entry.prizePoints)}
                      className="mt-1 block h-12 w-full"
                      strokeClassName="stroke-[#9b7c34]"
                      dotClassName="fill-[#9b7c34]"
                    />
                  </article>

                  <article className="rounded-xl border border-[#dedff0] bg-[linear-gradient(180deg,#fafbff_0%,#f2f3fb_100%)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#686f95]">Average place</p>
                    <p className="mt-1 text-2xl font-semibold text-[#3b4470]">
                      {formatOneDecimal(overviewStats.avgPlace)}
                    </p>
                    <Sparkline
                      values={averagePlaceTrend}
                      className="mt-1 block h-12 w-full"
                      strokeClassName="stroke-[#5f6ca3]"
                      dotClassName="fill-[#5f6ca3]"
                      invert
                    />
                  </article>
                </div>
              </div>
            )
          ) : insightsTab === "dynamics" ? (
            analyticsLoading ? (
              <div className="p-4">
                <div className="h-64 animate-pulse rounded-xl bg-[#eff3fa]" />
              </div>
            ) : analyticsError ? (
              <div className="p-4">
                <div className="rounded-xl border border-[#e7c3c3] bg-[#fff5f5] p-3 text-sm text-[#8d2f2f]">
                  Failed to load dynamics data: {analyticsError}
                </div>
              </div>
            ) : dynamicsSeries.points.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#f1f4fa] text-[#6e7788]">
                  <SearchXIcon className="size-5" />
                </div>
                <p className="mt-2 text-base font-medium text-[#2b3446]">Not enough data for chart</p>
                <p className="text-sm text-[#6e7788]">Try another year filter.</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#2b3b59]">{dynamicsSeries.title}</p>
                    <p className="text-xs text-[#6a768d]">
                      {dynamicsSeries.invert
                        ? "Lower line is better (place ranking)."
                        : "Higher line indicates stronger yearly output."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInsightModal("dynamics")}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-[#d3dcea] bg-[#f7f9fd] text-[#5a6985] transition-colors hover:bg-[#ebf1fb] hover:text-[#334b78]"
                      aria-label="Dynamics chart description"
                    >
                      <CircleHelpIcon className="size-4" />
                    </button>
                    <div className="inline-flex rounded-lg border border-[#d2dae9] bg-[#f8faff] p-1">
                      {[
                        { id: "ratingPoints", label: "РО" },
                        { id: "masterPoints", label: "МБ" },
                        { id: "prizePoints", label: "ПБ" },
                        { id: "avgPlace", label: "Place" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDynamicsMetric(item.id as DynamicsMetric)}
                          className={[
                            "h-8 rounded-md px-2.5 text-xs font-semibold transition-colors",
                            dynamicsMetric === item.id
                              ? "bg-[#e6edfb] text-[#2a4576]"
                              : "text-[#67758f] hover:bg-[#edf2fb] hover:text-[#2d4777]",
                          ].join(" ")}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#d8dfe9] bg-[linear-gradient(180deg,#f9fbff_0%,#f4f7fd_100%)] p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-[#697891]">
                    <span>
                      Min:{" "}
                      {formatDynamicsValue(dynamicsMetric, dynamicsMin)}
                    </span>
                    <span>
                      Max:{" "}
                      {formatDynamicsValue(dynamicsMetric, dynamicsMax)}
                    </span>
                  </div>
                  <div className="relative">
                    <svg
                      viewBox={`0 0 ${DYNAMICS_CHART_WIDTH} ${DYNAMICS_CHART_HEIGHT}`}
                      className="h-64 w-full"
                      aria-hidden
                    >
                      <path
                        d={`M10 ${dynamicsPlot.baselineY} H${DYNAMICS_CHART_WIDTH - 10}`}
                        className="stroke-[#d6deec]"
                        strokeWidth="1.2"
                        fill="none"
                      />
                      {dynamicsAreaPath ? <path d={dynamicsAreaPath} className="fill-[#d7e6ff]/55" /> : null}
                      {dynamicsLinePath ? (
                        <path
                          key={`line-${dynamicsMetric}-${selectedYears.join("-")}-${dynamicsSeries.points.length}`}
                          d={dynamicsLinePath}
                          className="stroke-[#395d97]"
                          strokeWidth="2.3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={dynamicsLineLength || 1}
                          strokeDashoffset={dynamicsLineLength || 1}
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from={String(dynamicsLineLength || 1)}
                            to="0"
                            dur="0.45s"
                            fill="freeze"
                          />
                        </path>
                      ) : null}
                    {dynamicsPlotPoints.map((point, index) => {
                      const entry = dynamicsSeries.points[index]
                      const labelY =
                        point.y > DYNAMICS_CHART_HEIGHT - 30
                          ? point.y - 10
                          : point.y < 24
                            ? point.y + 12
                            : point.y - 10

                      return (
                        <g key={`point-${index}`}>
                          <circle cx={point.x} cy={point.y} r="3" className="fill-[#2f4f86]" />
                          <text
                            x={point.x}
                            y={labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="10.5"
                            fontWeight="600"
                            fill="#4f5e7b"
                            style={{
                              paintOrder: "stroke",
                              stroke: "#f8fbff",
                              strokeWidth: 2.6,
                              strokeLinejoin: "round",
                            }}
                          >
                            {formatDynamicsValue(dynamicsMetric, entry.value)}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                    <div className="pointer-events-none absolute inset-0">
                      {dynamicsPlotPoints.map((point, index) => {
                        const entry = dynamicsSeries.points[index]
                        const left = (point.x / DYNAMICS_CHART_WIDTH) * 100
                        const top = (point.y / DYNAMICS_CHART_HEIGHT) * 100

                        return (
                          <Tooltip key={`point-tip-${entry.label}-${index}`}>
                            <TooltipTrigger
                              type="button"
                              className="pointer-events-auto absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#9ab0d6]/80"
                              style={{ left: `${left}%`, top: `${top}%` }}
                            >
                              <span className="sr-only">
                                {entry.label} {dynamicsSeries.valueLabel}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              sideOffset={8}
                              className="rounded-lg border border-[#d2dbe9] bg-[#f8faff] px-2.5 py-1.5 text-[#24324b] shadow-[0_12px_28px_-18px_rgba(31,49,83,0.65)]"
                            >
                              <div className="text-[11px] font-semibold text-[#63728e]">
                                Year: {entry.label}
                              </div>
                              <div className="text-xs font-semibold text-[#223656]">
                                {dynamicsSeries.valueLabel}: {formatDynamicsValue(dynamicsMetric, entry.value)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    className="mt-1 grid gap-1 text-[11px] text-[#6b788f]"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(dynamicsSeries.points.length, 1)}, minmax(0, 1fr))`,
                    }}
                  >
                    {dynamicsSeries.points.map((entry) => (
                      <span
                        key={`axis-${entry.label}`}
                        className="justify-self-center rounded-md bg-[#ecf1fa] px-1.5 py-0.5"
                      >
                        {entry.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : loading ? (
            <div className="p-4 text-sm text-[#6e7788]">Loading tournaments…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#f1f4fa] text-[#6e7788]">
                <SearchXIcon className="size-5" />
              </div>
              <p className="mt-2 text-base font-medium text-[#2b3446]">No tournaments found</p>
              <p className="text-sm text-[#6e7788]">There are no tournament records for this player.</p>
            </div>
          ) : (
            <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
              <div className="max-h-[64vh] overflow-y-auto overflow-x-hidden">
                <table className="w-full table-fixed text-[11.5px] leading-4">
                  <colgroup>
                    <col className="w-[8%]" />
                    <col className="w-[34%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[30%]" />
                  </colgroup>
                  <thead className="bg-[#f6f8fc] text-[#4c5a75]">
                    <tr>
                      <th className={sortableHeaderClass("year")}>
                        <button
                          type="button"
                          onClick={() => setSortFromHeader("year")}
                          className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-[#edf2fb] hover:text-[#2d4a78]"
                          title="Sort by year"
                          aria-pressed={sortBy === "year"}
                        >
                          Year
                          {renderSortIcon("year")}
                        </button>
                      </th>
                      <th className="sticky top-0 z-10 bg-[#f6f8fc] px-3 py-1.5 text-left text-[12px] font-semibold tracking-[0.01em] text-[#4c5a75] shadow-[inset_0_-1px_0_0_#e3e8f1]">
                        Tournament
                      </th>
                      <th className={`${sortableHeaderClass("place")} text-center`}>
                        <button
                          type="button"
                          onClick={() => setSortFromHeader("place")}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-[#edf2fb] hover:text-[#2d4a78]"
                          title="Sort by place"
                          aria-pressed={sortBy === "place"}
                        >
                          Place
                          {renderSortIcon("place")}
                        </button>
                      </th>
                      <th className={`${sortableHeaderClass("ratingPoints")} text-center`}>
                        <button
                          type="button"
                          onClick={() => setSortFromHeader("ratingPoints")}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-[#edf2fb] hover:text-[#2d4a78]"
                          title="Sort by rating points"
                          aria-pressed={sortBy === "ratingPoints"}
                        >
                          РО
                          {renderSortIcon("ratingPoints")}
                        </button>
                      </th>
                      <th className={`${sortableHeaderClass("masterPoints")} text-center`}>
                        <button
                          type="button"
                          onClick={() => setSortFromHeader("masterPoints")}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-[#edf2fb] hover:text-[#2d4a78]"
                          title="Sort by master points"
                          aria-pressed={sortBy === "masterPoints"}
                        >
                          МБ
                          {renderSortIcon("masterPoints")}
                        </button>
                      </th>
                      <th className={`${sortableHeaderClass("prizePoints")} text-center`}>
                        <button
                          type="button"
                          onClick={() => setSortFromHeader("prizePoints")}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-[#edf2fb] hover:text-[#2d4a78]"
                          title="Sort by prize points"
                          aria-pressed={sortBy === "prizePoints"}
                        >
                          ПБ
                          {renderSortIcon("prizePoints")}
                        </button>
                      </th>
                      <th className="sticky top-0 z-10 bg-[#f6f8fc] px-3 py-1.5 text-left text-[12px] font-semibold tracking-[0.01em] text-[#4c5a75] shadow-[inset_0_-1px_0_0_#e3e8f1]">
                        Partner / Team
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={`${row.sourcePlayerId}-${row.year ?? "na"}-${index}-${row.tournament}`}
                        className="border-t border-[#eef1f6] align-top text-[#2d3647] odd:bg-white even:bg-[#fbfcff] transition-[background-color,box-shadow] duration-150 hover:bg-[#edf4ff] hover:shadow-[inset_0_1px_0_#dce8ff,inset_0_-1px_0_#dce8ff]"
                      >
                        <td className="whitespace-nowrap px-2.5 py-[3px] tabular-nums">{row.year ?? "—"}</td>
                        <td className="px-2 py-[3px]">
                          <TableValueTooltip value={row.tournament} />
                        </td>
                        <td className="whitespace-nowrap px-1.5 py-[3px] text-center tabular-nums">{row.place ?? "—"}</td>
                        <td className="whitespace-nowrap px-1.5 py-[3px] text-center tabular-nums">{row.ratingPoints ?? "—"}</td>
                        <td className="whitespace-nowrap px-1.5 py-[3px] text-center tabular-nums">{formatNumber(row.masterPoints)}</td>
                        <td className="whitespace-nowrap px-1.5 py-[3px] text-center tabular-nums">{formatNumber(row.prizePoints)}</td>
                        <td className="px-2 py-[3px] text-[#3c465a]">
                          {row.partnerTeam ? <TableValueTooltip value={row.partnerTeam} /> : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e0e4ec] px-4 py-3">
                  <p className="text-xs text-[#6e7788]">
                    Page {page} of {totalPages} · total records: {total}
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
            </div>
          )}
        </section>

        {insightModal ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#18243a]/40 p-4 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            onClick={() => setInsightModal(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-[#cfd8ea] bg-[#f7faff] p-4 shadow-[0_24px_46px_-20px_rgba(15,23,42,0.75)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#22304c]">
                    {insightModal === "overview" ? "Overview visualization" : "Dynamics visualization"}
                  </h3>
                  <p className="mt-1 text-sm text-[#5d6b84]">
                    {insightModal === "overview"
                      ? "Cards summarize total contribution by metric, and sparklines show direction across years."
                      : "Line chart tracks year-by-year changes. For Place metric, lower values are better."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInsightModal(null)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-[#d4dceb] bg-white text-[#60708c] transition-colors hover:bg-[#edf2fb] hover:text-[#2e4778]"
                  aria-label="Close chart description"
                >
                  <XIcon className="size-4" />
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-[#dae2f1] bg-white/80 p-3 text-sm text-[#45556f]">
                {insightModal === "overview" ? (
                  <>
                    <p>What you see: RO/MB/PB totals, average place, and trend lines by year.</p>
                    <p className="mt-2">How to use: spot periods quickly, then open the table tab for exact tournaments.</p>
                  </>
                ) : (
                  <>
                    <p>What you see: yearly trend for selected metric with min/max context.</p>
                    <p className="mt-2">How to use: switch metrics and compare stability before diving into raw rows.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardShellPage>
  )
}
