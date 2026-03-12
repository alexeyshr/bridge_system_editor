import { asc, gte } from "drizzle-orm"

import { db } from "@/lib/db/drizzle/client"
import { bridgesportCalendarTournaments } from "@/lib/db/drizzle/schema"
import { ok } from "@/lib/server/api-response"

const DEFAULT_LIMIT = 180
const MAX_LIMIT = 360

type CalendarTournamentDto = {
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

function normalizeLimit(input: string | null): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.trunc(parsed), MAX_LIMIT)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = normalizeLimit(searchParams.get("limit"))

    const now = new Date()
    const rows = await db
      .select({
        id: bridgesportCalendarTournaments.id,
        sourceTournamentId: bridgesportCalendarTournaments.sourceTournamentId,
        name: bridgesportCalendarTournaments.name,
        city: bridgesportCalendarTournaments.city,
        dateLabel: bridgesportCalendarTournaments.dateLabel,
        monthLabel: bridgesportCalendarTournaments.monthLabel,
        tournamentCategory: bridgesportCalendarTournaments.tournamentCategory,
        tournamentType: bridgesportCalendarTournaments.tournamentType,
        tournamentFormat: bridgesportCalendarTournaments.tournamentFormat,
        registrationOpen: bridgesportCalendarTournaments.registrationOpen,
        registeredCount: bridgesportCalendarTournaments.registeredCount,
        participantsCount: bridgesportCalendarTournaments.participantsCount,
        sourceUrl: bridgesportCalendarTournaments.sourceUrl,
        startDate: bridgesportCalendarTournaments.startDate,
      })
      .from(bridgesportCalendarTournaments)
      .where(gte(bridgesportCalendarTournaments.startDate, now))
      .orderBy(asc(bridgesportCalendarTournaments.startDate))
      .limit(limit)

    const payload: CalendarTournamentDto[] = rows.map((row) => ({
      ...row,
      startDate: row.startDate.toISOString(),
    }))

    return ok({
      ready: true,
      generatedAt: new Date().toISOString(),
      total: payload.length,
      rows: payload,
    })
  } catch (error) {
    console.error("Failed to read calendar tournaments", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isDbConfigError = /DATABASE_URL|ECONNREFUSED|connect/i.test(errorMessage)
    const message = isDbConfigError
      ? "Calendar DB is unreachable. Start app with tunnel: npm run dev:remote"
      : "Calendar data source is unavailable"

    return ok({
      ready: false,
      generatedAt: new Date().toISOString(),
      total: 0,
      rows: [],
      message,
    })
  }
}
