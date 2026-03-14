import fs from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { count } from 'drizzle-orm';

import { closeDrizzleConnection, db } from '../lib/db/drizzle/client';
import {
  bridgesportTournamentResults,
  bridgesportTournaments,
} from '../lib/db/drizzle/schema';

type RawTournament = {
  id: number | string;
  name?: string;
  url?: string;
  year?: number | string;
  type?: string;
  results_link?: string;
  results?: unknown[];
};

const DATA_FILE = path.resolve(process.cwd(), 'data', 'bridge_results_all.json');
const CHUNK_SIZE = 100;

loadEnvConfig(process.cwd());

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== 'string') return null;

  const normalized = value.replace(/[^\d.-]+/g, '').replace(',', '.').trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function pickResultField(
  row: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = cleanText(asText(row[key]));
    if (value) return value;
  }
  return null;
}

function toEntityId(prefix: string, sourceId: number): string {
  return `${prefix}_${sourceId}`;
}

async function readTournaments(): Promise<RawTournament[]> {
  const content = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(content) as RawTournament[];
}

async function runInChunks<T>(values: T[], runChunk: (chunk: T[]) => Promise<void>) {
  for (let index = 0; index < values.length; index += CHUNK_SIZE) {
    const chunk = values.slice(index, index + CHUNK_SIZE);
    if (!chunk.length) continue;
    await runWithRetry(() => runChunk(chunk));
  }
}

function isConnectionClosedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('CONNECTION_CLOSED') || message.includes('ECONNRESET');
}

async function runWithRetry(action: () => Promise<void>, maxAttempts = 6): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await action();
      return;
    } catch (error) {
      lastError = error;
      if (!isConnectionClosedError(error) || attempt === maxAttempts) {
        throw error;
      }

      const waitMs = Math.min(500 * attempt, 3_000);
      console.warn(
        `[reload-tournament-results] Connection dropped, retrying (${attempt}/${maxAttempts}) in ${waitMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const now = new Date();
  const rows = await readTournaments();

  const tournamentValues = rows
    .map((row) => {
      const sourceTournamentId = parseInteger(row.id);
      if (!sourceTournamentId || !row.name) return null;

      return {
        id: toEntityId('bs_tournament', sourceTournamentId),
        sourceTournamentId,
        name: row.name,
        year: parseInteger(row.year),
        sourceType: row.type ?? null,
        tournamentUrl: row.url ?? null,
        resultsUrl: row.results_link ?? null,
        resultsRows: Array.isArray(row.results) ? row.results.length : 0,
        startDate: null,
        city: null,
        monthLabel: null,
        raw: {
          source: 'bridge_results_all.json',
          hasResults: Array.isArray(row.results),
          resultColumns:
            Array.isArray(row.results) &&
            typeof row.results[0] === 'object' &&
            row.results[0] !== null
              ? Object.keys(row.results[0] as Record<string, unknown>)
              : [],
        },
        createdAt: now,
        updatedAt: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const tournamentResultValues = rows.flatMap((row) => {
    const sourceTournamentId = parseInteger(row.id);
    if (!sourceTournamentId || !Array.isArray(row.results)) return [];

    return row.results.map((resultRow, index) => {
      const normalizedRaw = (
        resultRow && typeof resultRow === 'object' && !Array.isArray(resultRow)
          ? resultRow
          : { value: resultRow }
      ) as Record<string, unknown>;

      const playerNames = [
        pickResultField(normalizedRaw, ['Игрок1', 'name1', 'player1']),
        pickResultField(normalizedRaw, ['Игрок2', 'name2', 'player2']),
      ].filter((value): value is string => Boolean(value));

      return {
        id: `bs_tournament_result_${sourceTournamentId}_${index + 1}`,
        sourceTournamentId,
        rowOrder: index + 1,
        placeLabel: pickResultField(normalizedRaw, ['#', 'rk', 'rank', 'место']),
        teamName: pickResultField(normalizedRaw, ['Команда', 'team', 'pair', 'name']),
        players:
          pickResultField(normalizedRaw, ['Игроки', 'player']) ??
          (playerNames.length > 0 ? playerNames.join(', ') : null),
        resultLabel: pickResultField(normalizedRaw, [
          'Результат',
          'Results',
          'result',
          'Final',
          'Total',
        ]),
        prizePoints: pickResultField(normalizedRaw, ['ПБ', 'pb']),
        ratingPoints: pickResultField(normalizedRaw, ['РО', 'ro']),
        masterPoints: pickResultField(normalizedRaw, ['МБ', 'mb']),
        raw: normalizedRaw,
        createdAt: now,
        updatedAt: now,
      };
    });
  });

  await runInChunks(tournamentValues, async (chunk) => {
    await db
      .insert(bridgesportTournaments)
      .values(chunk)
      .onConflictDoNothing();
  });

  await runInChunks(tournamentResultValues, async (chunk) => {
    await db
      .insert(bridgesportTournamentResults)
      .values(chunk)
      .onConflictDoNothing();
  });

  const [tournamentCountRow] = await db.select({ total: count() }).from(bridgesportTournaments);
  const [resultCountRow] = await db.select({ total: count() }).from(bridgesportTournamentResults);

  const tournamentCount = Number(tournamentCountRow?.total ?? 0);
  const resultCount = Number(resultCountRow?.total ?? 0);

  console.log(`Tournament results reload complete:
  tournaments: ${tournamentValues.length}
  tournament results: ${tournamentResultValues.length}
  table tournaments count: ${tournamentCount}
  table results count: ${resultCount}`);
}

main()
  .catch((error) => {
    console.error('Tournament results reload failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDrizzleConnection();
  });
