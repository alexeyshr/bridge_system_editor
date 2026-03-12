import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  ilike,
  isNotNull,
  lte,
  or,
} from "drizzle-orm"

import { db } from "@/lib/db/drizzle/client"
import { bridgesportPlayers } from "@/lib/db/drizzle/schema"
import { ok } from "@/lib/server/api-response"

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 120
const DEFAULT_PAGE = 1
const SORT_OPTIONS = ["rating", "prize", "master", "name", "tournaments"] as const

type SortKey = (typeof SORT_OPTIONS)[number]

function normalizeLimit(input: string | null): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.trunc(parsed), MAX_LIMIT)
}

function normalizePage(input: string | null): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE
  return Math.trunc(parsed)
}

function normalizeSort(input: string | null): SortKey {
  const value = (input ?? "").trim().toLowerCase()
  if (SORT_OPTIONS.includes(value as SortKey)) return value as SortKey
  return "rating"
}

function normalizeQuery(input: string | null): string {
  return (input ?? "").trim()
}

function normalizeCity(input: string | null): string {
  const city = (input ?? "").trim()
  if (!city || city.toLowerCase() === "all") return "all"
  return city
}

function parseNumericQuery(query: string): number | null {
  if (!query) return null
  const parsed = Number(query)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function parseIntegerFilter(value: string | null): number | null {
  if (value === null) return null
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.trunc(parsed)
}

function normalizeRank(input: string | null): string {
  const value = (input ?? "").trim()
  if (!value) return "all"
  if (/^-?[0-5]$/.test(value)) return value
  if (value.toLowerCase() === "all") return "all"
  return "all"
}

function parseListParam(input: string | null): string[] {
  if (!input) return []
  return [...new Set(input.split(",").map((item) => item.trim()).filter(Boolean))]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = normalizeLimit(searchParams.get("limit"))
    const requestedPage = normalizePage(searchParams.get("page"))
    const query = normalizeQuery(searchParams.get("q"))
    const city = normalizeCity(searchParams.get("city"))
    const cities = parseListParam(searchParams.get("cities"))
    const sort = normalizeSort(searchParams.get("sort"))
    const rank = normalizeRank(searchParams.get("rank"))
    const ranksRaw = parseListParam(searchParams.get("ranks"))
    const ranks = ranksRaw.filter((value) => /^-?[0-5]$/.test(value))
    const ratingMin = parseIntegerFilter(searchParams.get("ratingMin"))
    const ratingMax = parseIntegerFilter(searchParams.get("ratingMax"))
    const prizeMin = parseIntegerFilter(searchParams.get("prizeMin"))
    const prizeMax = parseIntegerFilter(searchParams.get("prizeMax"))
    const masterMin = parseIntegerFilter(searchParams.get("masterMin"))
    const masterMax = parseIntegerFilter(searchParams.get("masterMax"))

    const filters = []
    const selectedCitiesRaw = cities.length > 0 ? cities : city !== "all" ? [city] : []
    const selectedCities = selectedCitiesRaw.filter((value) => value.toLowerCase() !== "all")
    const selectedRanks = ranks.length > 0 ? ranks : rank !== "all" ? [rank] : []

    if (selectedCities.length === 1) {
      filters.push(eq(bridgesportPlayers.city, selectedCities[0]))
    } else if (selectedCities.length > 1) {
      filters.push(inArray(bridgesportPlayers.city, selectedCities))
    }
    if (selectedRanks.length === 1) {
      filters.push(eq(bridgesportPlayers.rank, selectedRanks[0]))
    } else if (selectedRanks.length > 1) {
      filters.push(inArray(bridgesportPlayers.rank, selectedRanks))
    }
    if (ratingMin !== null) {
      filters.push(gte(bridgesportPlayers.rating, ratingMin))
    }
    if (ratingMax !== null) {
      filters.push(lte(bridgesportPlayers.rating, ratingMax))
    }
    if (prizeMin !== null) {
      filters.push(gte(bridgesportPlayers.prizePoints, prizeMin))
    }
    if (prizeMax !== null) {
      filters.push(lte(bridgesportPlayers.prizePoints, prizeMax))
    }
    if (masterMin !== null) {
      filters.push(gte(bridgesportPlayers.masterPoints, masterMin))
    }
    if (masterMax !== null) {
      filters.push(lte(bridgesportPlayers.masterPoints, masterMax))
    }

    if (query) {
      const pattern = `%${query}%`
      const numericQuery = parseNumericQuery(query)
      const textFilters = [
        ilike(bridgesportPlayers.name, pattern),
        ilike(bridgesportPlayers.city, pattern),
        ilike(bridgesportPlayers.rank, pattern),
        ilike(bridgesportPlayers.club, pattern),
        ilike(bridgesportPlayers.gamblerNick, pattern),
        ilike(bridgesportPlayers.bboNick, pattern),
      ]

      if (numericQuery !== null) {
        textFilters.push(eq(bridgesportPlayers.sourcePlayerId, numericQuery))
      }

      filters.push(or(...textFilters)!)
    }

    const whereClause =
      filters.length === 0
        ? undefined
        : filters.length === 1
          ? filters[0]
          : and(...filters)

    const totalQuery = db
      .select({
        total: count(),
      })
      .from(bridgesportPlayers)

    const [{ total: rawTotal = 0 }] = await (whereClause
      ? totalQuery.where(whereClause)
      : totalQuery)

    const total = Number(rawTotal)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const page = Math.min(requestedPage, totalPages)
    const offset = (page - 1) * limit
    const orderBy =
      sort === "name"
        ? [asc(bridgesportPlayers.name)]
        : sort === "prize"
          ? [desc(bridgesportPlayers.prizePoints), asc(bridgesportPlayers.name)]
          : sort === "master"
            ? [desc(bridgesportPlayers.masterPoints), asc(bridgesportPlayers.name)]
            : sort === "tournaments"
              ? [desc(bridgesportPlayers.tournamentsCount), asc(bridgesportPlayers.name)]
              : [desc(bridgesportPlayers.rating), asc(bridgesportPlayers.name)]

    const rowsQuery = db
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
        club: bridgesportPlayers.club,
        tournamentsCount: bridgesportPlayers.tournamentsCount,
        profileUrl: bridgesportPlayers.profileUrl,
        gamblerNick: bridgesportPlayers.gamblerNick,
        bboNick: bridgesportPlayers.bboNick,
      })
      .from(bridgesportPlayers)

    const rows = await (whereClause ? rowsQuery.where(whereClause) : rowsQuery)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset)

    const cityRows = await db
      .select({
        city: bridgesportPlayers.city,
      })
      .from(bridgesportPlayers)
      .where(isNotNull(bridgesportPlayers.city))
      .groupBy(bridgesportPlayers.city)
      .orderBy(asc(bridgesportPlayers.city))

    const cityOptions = [...new Set(cityRows.map((row) => row.city).filter(Boolean))]

    return ok({
      ready: true,
      generatedAt: new Date().toISOString(),
      query,
      city: selectedCities[0] ?? "all",
      citiesSelected: selectedCities,
      sort,
      rank: selectedRanks[0] ?? "all",
      ranksSelected: selectedRanks,
      ratingMin,
      ratingMax,
      prizeMin,
      prizeMax,
      masterMin,
      masterMax,
      total,
      page,
      pageSize: limit,
      totalPages,
      rows,
      cities: cityOptions,
    })
  } catch (error) {
    console.error("Failed to search BridgeSport players", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isDbConfigError = /DATABASE_URL|ECONNREFUSED|connect/i.test(errorMessage)
    const message = isDbConfigError
      ? "Players DB is unreachable. Start app with tunnel: npm run dev:remote"
      : "Players data source is unavailable"

    return ok({
      ready: false,
      generatedAt: new Date().toISOString(),
      query: "",
      city: "all",
      citiesSelected: [],
      sort: "rating",
      rank: "all",
      ranksSelected: [],
      ratingMin: null,
      ratingMax: null,
      prizeMin: null,
      prizeMax: null,
      masterMin: null,
      masterMax: null,
      total: 0,
      page: 1,
      pageSize: DEFAULT_LIMIT,
      totalPages: 1,
      rows: [],
      cities: [],
      message,
    })
  }
}
