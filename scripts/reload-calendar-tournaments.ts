import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { count } from "drizzle-orm";

import { closeDrizzleConnection, db } from "../lib/db/drizzle/client";
import { bridgesportCalendarTournaments } from "../lib/db/drizzle/schema";

type RawCalendarTournament = {
  id: number | string;
  name?: string;
  date?: string;
  month?: string;
  city?: string;
  url?: string;
  tournament_category?: string;
  tournament_type?: string;
  tournament_format?: string;
  registration_open?: boolean;
  registered_count?: number | string;
  start_date?: string;
  participants?: unknown[];
  [key: string]: unknown;
};

const DATA_FILE = path.resolve(process.cwd(), "data", "calendar_tournaments.json");
const CHUNK_SIZE = 500;

loadEnvConfig(process.cwd());

function parseInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return null;

  const normalized = value.replace(/[^\d.-]+/g, "").replace(",", ".").trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toEntityId(prefix: string, sourceId: number): string {
  return `${prefix}_${sourceId}`;
}

function nextSyntheticSourceId(usedIds: Set<number>): number {
  let candidate = -1;
  while (usedIds.has(candidate)) candidate -= 1;
  usedIds.add(candidate);
  return candidate;
}

async function readCalendarRows(): Promise<RawCalendarTournament[]> {
  const content = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(content) as RawCalendarTournament[];
}

async function runInChunks<T>(values: T[], runChunk: (chunk: T[]) => Promise<void>) {
  for (let index = 0; index < values.length; index += CHUNK_SIZE) {
    const chunk = values.slice(index, index + CHUNK_SIZE);
    if (!chunk.length) continue;
    await runChunk(chunk);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const now = new Date();
  const rows = await readCalendarRows();
  const usedSourceIds = new Set<number>();

  let skipped = 0;
  const values = rows
    .map((row) => {
      let sourceTournamentId = parseInteger(row.id);
      const startDate = parseIsoDate(row.start_date);
      if (!row.name || !startDate) {
        skipped += 1;
        return null;
      }

      if (sourceTournamentId === null) {
        sourceTournamentId = nextSyntheticSourceId(usedSourceIds);
      } else {
        usedSourceIds.add(sourceTournamentId);
      }

      const sanitizedRaw = { ...row };
      delete sanitizedRaw.venue;
      delete sanitizedRaw.entry_fee;
      delete sanitizedRaw.registration_deadline;

      return {
        id: toEntityId("bs_calendar_tournament", sourceTournamentId),
        sourceTournamentId,
        name: row.name,
        sourceUrl: row.url ?? null,
        city: row.city ?? null,
        dateLabel: row.date ?? null,
        monthLabel: row.month ?? null,
        tournamentCategory: row.tournament_category ?? null,
        tournamentType: row.tournament_type ?? null,
        tournamentFormat: row.tournament_format ?? null,
        registrationOpen: Boolean(row.registration_open),
        registeredCount: parseInteger(row.registered_count),
        startDate,
        participantsCount: Array.isArray(row.participants) ? row.participants.length : 0,
        participants: Array.isArray(row.participants) ? row.participants : [],
        raw: sanitizedRaw,
        createdAt: now,
        updatedAt: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  await db.delete(bridgesportCalendarTournaments);
  await runInChunks(values, async (chunk) => {
    await db.insert(bridgesportCalendarTournaments).values(chunk);
  });

  const [result] = await db.select({ total: count() }).from(bridgesportCalendarTournaments);
  const total = typeof result?.total === "number" ? result.total : Number(result?.total ?? 0);

  console.log(`Calendar tournaments reload complete:
  source rows: ${rows.length}
  inserted: ${values.length}
  skipped: ${skipped}
  table count: ${total}`);
}

main()
  .catch((error) => {
    console.error("Calendar tournaments reload failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDrizzleConnection();
  });
