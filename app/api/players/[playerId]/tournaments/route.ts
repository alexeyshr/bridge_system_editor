import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm"

import { db } from "@/lib/db/drizzle/client"
import {
  bridgesportPlayers,
  bridgesportPlayerTournaments,
} from "@/lib/db/drizzle/schema"
import { badRequest, notFound, ok, serverError } from "@/lib/server/api-response"

type RouteContext = {
  params: Promise<{ playerId: string }>
}

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100
const TOURNAMENT_SORT_OPTIONS = [
  "year",
  "masterPoints",
  "prizePoints",
  "place",
  "ratingPoints",
] as const

type TournamentSort = (typeof TOURNAMENT_SORT_OPTIONS)[number]
type TournamentSortDirection = "asc" | "desc"

function normalizeLimit(input: string | null): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.trunc(parsed), MAX_LIMIT)
}

function normalizePage(input: string | null): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return 1
  return Math.trunc(parsed)
}

function parseInteger(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function normalizeSort(input: string | null): TournamentSort {
  if (!input) return "year"
  return TOURNAMENT_SORT_OPTIONS.includes(input as TournamentSort)
    ? (input as TournamentSort)
    : "year"
}

function normalizeDirection(input: string | null): TournamentSortDirection {
  if (!input) return "desc"
  return input === "asc" || input === "desc" ? input : "desc"
}

function normalizeYearFilter(input: string | null): number | null {
  if (!input || input === "all") return null
  const parsed = Number(input)
  if (!Number.isInteger(parsed)) return null
  if (parsed < 1900 || parsed > 2100) return null
  return parsed
}

function normalizeYearsFilter(searchParams: URLSearchParams): number[] | null {
  const rawValues: string[] = []
  rawValues.push(...searchParams.getAll("year"))
  rawValues.push(...searchParams.getAll("years"))

  const parsed = rawValues
    .flatMap((value) => value.split(","))
    .map((value) => normalizeYearFilter(value.trim()))
    .filter((value): value is number => value !== null)

  if (parsed.length === 0) return null
  return Array.from(new Set(parsed))
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = normalizeLimit(searchParams.get("limit"))
    const requestedPage = normalizePage(searchParams.get("page"))
    const sort = normalizeSort(searchParams.get("sort"))
    const direction = normalizeDirection(searchParams.get("direction"))
    const yearFilters = normalizeYearsFilter(searchParams)
    const { playerId: rawPlayerId } = await context.params
    const playerId = decodeURIComponent(rawPlayerId).trim()

    if (!playerId) return badRequest("playerId is required")

    const sourcePlayerId = parseInteger(playerId)
    const [player] = await db
      .select({
        id: bridgesportPlayers.id,
        sourcePlayerId: bridgesportPlayers.sourcePlayerId,
        name: bridgesportPlayers.name,
        city: bridgesportPlayers.city,
        rank: bridgesportPlayers.rank,
        rating: bridgesportPlayers.rating,
        ratingPosition: bridgesportPlayers.ratingPosition,
        maxRatingPosition: bridgesportPlayers.maxRatingPosition,
        prizePoints: bridgesportPlayers.prizePoints,
        masterPoints: bridgesportPlayers.masterPoints,
        tournamentsCount: bridgesportPlayers.tournamentsCount,
        profileUrl: bridgesportPlayers.profileUrl,
        gamblerNick: bridgesportPlayers.gamblerNick,
        bboNick: bridgesportPlayers.bboNick,
        club: bridgesportPlayers.club,
      })
      .from(bridgesportPlayers)
      .where(
        sourcePlayerId !== null
          ? or(
              eq(bridgesportPlayers.id, playerId),
              eq(bridgesportPlayers.sourcePlayerId, sourcePlayerId),
            )
          : eq(bridgesportPlayers.id, playerId),
      )
      .limit(1)

    if (!player) return notFound("Player not found")

    const tournamentsBaseWhere = eq(
      bridgesportPlayerTournaments.sourcePlayerId,
      player.sourcePlayerId,
    )
    const tournamentsWhere =
      yearFilters && yearFilters.length > 0
        ? and(
            tournamentsBaseWhere,
            yearFilters.length === 1
              ? eq(bridgesportPlayerTournaments.year, yearFilters[0])
              : inArray(bridgesportPlayerTournaments.year, yearFilters),
          )
        : tournamentsBaseWhere

    const yearRows = await db
      .select({
        year: bridgesportPlayerTournaments.year,
      })
      .from(bridgesportPlayerTournaments)
      .where(tournamentsBaseWhere)
      .groupBy(bridgesportPlayerTournaments.year)
      .orderBy(desc(bridgesportPlayerTournaments.year))

    const years = yearRows
      .map((row) => row.year)
      .filter((value): value is number => typeof value === "number")

    const [totalRow] = await db
      .select({ total: count() })
      .from(bridgesportPlayerTournaments)
      .where(tournamentsWhere)

    const total = Number(totalRow?.total ?? 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const page = Math.min(requestedPage, totalPages)
    const offset = (page - 1) * limit

    const nullSentinel = direction === "asc" ? 2147483647 : -2147483648
    const yearOrderExpr = sql<number>`coalesce(${bridgesportPlayerTournaments.year}, ${nullSentinel})`
    const masterPointsOrderExpr = sql<number>`
      coalesce(${bridgesportPlayerTournaments.masterPoints}, ${nullSentinel})
    `
    const prizePointsOrderExpr = sql<number>`
      coalesce(${bridgesportPlayerTournaments.prizePoints}, ${nullSentinel})
    `
    const ratingPointsOrderExpr = sql<number>`
      coalesce(
        nullif(regexp_replace(${bridgesportPlayerTournaments.ratingPoints}, '[^0-9-]+', '', 'g'), '')::integer,
        ${nullSentinel}
      )
    `
    const placeOrderExpr = sql<number>`
      coalesce(
        nullif(substring(${bridgesportPlayerTournaments.place} from '\\d+'), '')::integer,
        ${nullSentinel}
      )
    `

    const primaryExpr =
      sort === "year"
        ? yearOrderExpr
        : sort === "masterPoints"
          ? masterPointsOrderExpr
          : sort === "prizePoints"
            ? prizePointsOrderExpr
            : sort === "ratingPoints"
              ? ratingPointsOrderExpr
              : placeOrderExpr

    const primaryOrder = direction === "asc" ? asc(primaryExpr) : desc(primaryExpr)
    const yearTieBreaker = direction === "asc" ? asc(yearOrderExpr) : desc(yearOrderExpr)
    const orderBy = [primaryOrder, yearTieBreaker, asc(bridgesportPlayerTournaments.rowOrder)]

    const rows = await db
      .select({
        sourcePlayerId: bridgesportPlayerTournaments.sourcePlayerId,
        playerName: bridgesportPlayerTournaments.playerName,
        year: bridgesportPlayerTournaments.year,
        masterPoints: bridgesportPlayerTournaments.masterPoints,
        prizePoints: bridgesportPlayerTournaments.prizePoints,
        ratingPoints: bridgesportPlayerTournaments.ratingPoints,
        place: bridgesportPlayerTournaments.place,
        partnerTeam: bridgesportPlayerTournaments.partnerTeam,
        tournament: bridgesportPlayerTournaments.tournament,
      })
      .from(bridgesportPlayerTournaments)
      .where(tournamentsWhere)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset)

    return ok({
      ready: true,
      generatedAt: new Date().toISOString(),
      player,
      page,
      pageSize: limit,
      total,
      totalPages,
      years,
      sort,
      direction,
      year: yearFilters && yearFilters.length === 1 ? yearFilters[0] : null,
      yearsFilter: yearFilters ?? [],
      rows,
    })
  } catch (error) {
    console.error("Failed to load player tournaments", error)
    return serverError("Failed to load player tournaments")
  }
}
