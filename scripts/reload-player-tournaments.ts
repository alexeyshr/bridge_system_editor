import fs from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { loadEnvConfig } from "@next/env"
import { count } from "drizzle-orm"

import { closeDrizzleConnection, db } from "../lib/db/drizzle/client"
import { bridgesportPlayerTournaments } from "../lib/db/drizzle/schema"

type ParsedPlayerTournamentRow = {
  sourcePlayerId: number
  playerName: string | null
  year: number | null
  masterPoints: number | null
  prizePoints: number | null
  ratingPoints: string | null
  place: string | null
  partnerTeam: string | null
  tournament: string
  rowOrder: number
  raw: Record<string, string>
}

const DATA_FILE = path.resolve(process.cwd(), "data", "players_tournaments.csv")
const CHUNK_SIZE = 500

loadEnvConfig(process.cwd())

function parseInteger(value: string | undefined): number | null {
  if (!value) return null
  const normalized = value.replace(/[^\d.-]+/g, "").replace(",", ".").trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.trunc(parsed)
}

function cleanText(value: string | undefined): string | null {
  if (!value) return null
  const cleaned = value.trim()
  return cleaned.length > 0 ? cleaned : null
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let buffer = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === "\"") {
      const nextChar = line[index + 1]
      if (inQuotes && nextChar === "\"") {
        buffer += "\""
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      fields.push(buffer)
      buffer = ""
      continue
    }

    buffer += char
  }

  fields.push(buffer)
  return fields
}

async function parsePlayerTournamentCsv(): Promise<ParsedPlayerTournamentRow[]> {
  const rawCsv = await fs.readFile(DATA_FILE, "utf-8")
  const lines = rawCsv.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []

  const header = parseCsvLine(lines[0]).map((field) =>
    field.replace(/^\uFEFF/, "").trim(),
  )

  const playerIdIndex = header.indexOf("player_id")
  const playerNameIndex = header.indexOf("player_name")
  const yearIndex = header.indexOf("Год")
  const masterPointsIndex = header.indexOf("МБ")
  const prizePointsIndex = header.indexOf("ПБ")
  const ratingPointsIndex = header.indexOf("РО")
  const placeIndex = header.indexOf("место")
  const partnerTeamIndex = header.indexOf("партнер/команда")
  const tournamentIndex = header.indexOf("турнир")

  if (
    playerIdIndex < 0 ||
    tournamentIndex < 0 ||
    yearIndex < 0 ||
    masterPointsIndex < 0 ||
    prizePointsIndex < 0
  ) {
    throw new Error("players_tournaments.csv has unexpected header format")
  }

  const rows: ParsedPlayerTournamentRow[] = []

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex])
    const sourcePlayerId = parseInteger(cells[playerIdIndex])
    const tournament = cleanText(cells[tournamentIndex])
    if (!sourcePlayerId || !tournament) continue

    const raw: Record<string, string> = {}
    for (let columnIndex = 0; columnIndex < header.length; columnIndex += 1) {
      raw[header[columnIndex]] = cells[columnIndex] ?? ""
    }

    rows.push({
      sourcePlayerId,
      playerName: cleanText(cells[playerNameIndex]),
      year: parseInteger(cells[yearIndex]),
      masterPoints: parseInteger(cells[masterPointsIndex]),
      prizePoints: parseInteger(cells[prizePointsIndex]),
      ratingPoints: cleanText(cells[ratingPointsIndex]),
      place: cleanText(cells[placeIndex]),
      partnerTeam: cleanText(cells[partnerTeamIndex]),
      tournament,
      rowOrder: lineIndex,
      raw,
    })
  }

  return rows
}

async function runInChunks<T>(values: T[], runChunk: (chunk: T[]) => Promise<void>) {
  for (let index = 0; index < values.length; index += CHUNK_SIZE) {
    const chunk = values.slice(index, index + CHUNK_SIZE)
    if (!chunk.length) continue
    await runChunk(chunk)
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }

  const now = new Date()
  const parsedRows = await parsePlayerTournamentCsv()
  const values = parsedRows.map((row) => ({
    id: `bs_player_tournament_${randomUUID()}`,
    sourcePlayerId: row.sourcePlayerId,
    playerName: row.playerName,
    year: row.year,
    masterPoints: row.masterPoints,
    prizePoints: row.prizePoints,
    ratingPoints: row.ratingPoints,
    place: row.place,
    partnerTeam: row.partnerTeam,
    tournament: row.tournament,
    rowOrder: row.rowOrder,
    raw: row.raw,
    createdAt: now,
    updatedAt: now,
  }))

  await db.delete(bridgesportPlayerTournaments)
  await runInChunks(values, async (chunk) => {
    await db.insert(bridgesportPlayerTournaments).values(chunk)
  })

  const [result] = await db.select({ total: count() }).from(bridgesportPlayerTournaments)
  const total = typeof result?.total === "number" ? result.total : Number(result?.total ?? 0)

  console.log(`Player tournaments reload complete:
  source rows: ${parsedRows.length}
  inserted: ${values.length}
  table count: ${total}`)
}

main()
  .catch((error) => {
    console.error("Player tournaments reload failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDrizzleConnection()
  })

