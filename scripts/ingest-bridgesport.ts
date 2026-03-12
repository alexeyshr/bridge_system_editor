import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadEnvConfig } from '@next/env';

import { closeDrizzleConnection, db } from '../lib/db/drizzle/client';
import {
  bridgesportCalendarTournaments,
  bridgesportPlayerTournaments,
  bridgesportPlayers,
  bridgesportRatingSnapshots,
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
};

type RawPlayerCard = {
  player_id?: number | string;
  name?: string;
  city?: string;
  rank?: string;
  rating?: number | string;
  rating_position?: number | string;
  max_rating_position?: number | string;
  prize_points?: number | string;
  master_points?: number | string;
  online_master_points?: number | string;
  gambler_nick?: string;
  bbo_nick?: string;
  club?: string;
  tournaments_count?: number | string;
  url?: string;
};

type RawPlayersRecord = {
  card?: RawPlayerCard;
};

type RawRatingSnapshot = {
  id: number | string;
  name?: string;
  url?: string;
  type?: number | string;
  type_name?: string;
  headers?: unknown[];
  data?: unknown[];
};

type RawPlayerTournamentHistoryRow = {
  sourcePlayerId: number;
  playerName: string | null;
  year: number | null;
  masterPoints: number | null;
  prizePoints: number | null;
  ratingPoints: string | null;
  place: string | null;
  partnerTeam: string | null;
  tournament: string;
  sourceRowNumber: number;
  raw: Record<string, string>;
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CHUNK_SIZE = 500;

loadEnvConfig(process.cwd());

const russianMonthMap: Record<string, string> = {
  января: '01',
  февраля: '02',
  марта: '03',
  апреля: '04',
  мая: '05',
  июня: '06',
  июля: '07',
  августа: '08',
  сентября: '09',
  октября: '10',
  ноября: '11',
  декабря: '12',
};

async function readJsonFile<T>(filename: string): Promise<T> {
  const fullPath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(content) as T;
}

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

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseSnapshotDate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = value.toLowerCase().match(/на\s+(\d{1,2})\s+([а-я]+)\s+(\d{4})/u);
  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const month = russianMonthMap[match[2]];
  const year = match[3];
  if (!month) return null;

  const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toEntityId(prefix: string, sourceId: number): string {
  return `${prefix}_${sourceId}`;
}

function toRandomEntityId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let buffer = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        buffer += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(buffer);
      buffer = '';
      continue;
    }

    buffer += char;
  }

  fields.push(buffer);
  return fields;
}

async function readPlayerTournamentHistoryCsv(): Promise<RawPlayerTournamentHistoryRow[]> {
  const csvPath = path.join(DATA_DIR, 'players_tournaments.csv');
  const rawCsv = await fs.readFile(csvPath, 'utf-8');
  const lines = rawCsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((field) =>
    field.replace(/^\uFEFF/, '').trim(),
  );

  const playerIdIndex = header.indexOf('player_id');
  const playerNameIndex = header.indexOf('player_name');
  const yearIndex = header.indexOf('Год');
  const masterPointsIndex = header.indexOf('МБ');
  const prizePointsIndex = header.indexOf('ПБ');
  const ratingPointsIndex = header.indexOf('РО');
  const placeIndex = header.indexOf('место');
  const partnerTeamIndex = header.indexOf('партнер/команда');
  const tournamentIndex = header.indexOf('турнир');

  if (
    playerIdIndex < 0 ||
    tournamentIndex < 0 ||
    yearIndex < 0 ||
    masterPointsIndex < 0 ||
    prizePointsIndex < 0
  ) {
    throw new Error('players_tournaments.csv has unexpected header format');
  }

  const rows: RawPlayerTournamentHistoryRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    const sourcePlayerId = parseInteger(cells[playerIdIndex]);
    const tournament = cleanText(cells[tournamentIndex]);

    if (!sourcePlayerId || !tournament) continue;

    const raw: Record<string, string> = {};
    for (let cellIndex = 0; cellIndex < header.length; cellIndex += 1) {
      raw[header[cellIndex]] = cells[cellIndex] ?? '';
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
      sourceRowNumber: lineIndex,
      raw,
    });
  }

  return rows;
}

async function upsertInChunks<T>(values: T[], runChunk: (chunk: T[]) => Promise<void>) {
  for (let index = 0; index < values.length; index += CHUNK_SIZE) {
    const chunk = values.slice(index, index + CHUNK_SIZE);
    if (!chunk.length) continue;
    await runChunk(chunk);
  }
}

async function ingest() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const now = new Date();

  const [tournamentRows, calendarRows, playersRows, ratingRows, playerTournamentRows] = await Promise.all([
    readJsonFile<RawTournament[]>('bridge_results_all.json'),
    readJsonFile<RawCalendarTournament[]>('calendar_tournaments.json'),
    readJsonFile<RawPlayersRecord[]>('players_all.json'),
    readJsonFile<RawRatingSnapshot[]>('ratings_all.json'),
    readPlayerTournamentHistoryCsv(),
  ]);

  const calendarByTournamentId = new Map<number, RawCalendarTournament>();
  for (const row of calendarRows) {
    const sourceTournamentId = parseInteger(row.id);
    if (!sourceTournamentId) continue;
    calendarByTournamentId.set(sourceTournamentId, row);
  }

  const tournamentValues = tournamentRows
    .map((row) => {
      const sourceTournamentId = parseInteger(row.id);
      if (!sourceTournamentId || !row.name) return null;

      const calendar = calendarByTournamentId.get(sourceTournamentId);
      const startDate = parseIsoDate(calendar?.start_date);

      return {
        id: toEntityId('bs_tournament', sourceTournamentId),
        sourceTournamentId,
        name: row.name,
        year: parseInteger(row.year),
        sourceType: row.type ?? null,
        tournamentUrl: row.url ?? null,
        resultsUrl: row.results_link ?? null,
        resultsRows: Array.isArray(row.results) ? row.results.length : 0,
        startDate,
        city: calendar?.city ?? null,
        monthLabel: calendar?.month ?? null,
        raw: {
          source: 'bridge_results_all.json',
          hasResults: Array.isArray(row.results),
          resultColumns: Array.isArray(row.results) && typeof row.results[0] === 'object' && row.results[0] !== null
            ? Object.keys(row.results[0] as Record<string, unknown>)
            : [],
        },
        createdAt: now,
        updatedAt: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const calendarValues = calendarRows
    .map((row) => {
      const sourceTournamentId = parseInteger(row.id);
      const startDate = parseIsoDate(row.start_date);
      if (!sourceTournamentId || !row.name || !startDate) return null;
      const sanitizedRaw = { ...row } as Record<string, unknown>;
      delete sanitizedRaw.venue;
      delete sanitizedRaw.entry_fee;
      delete sanitizedRaw.registration_deadline;

      return {
        id: toEntityId('bs_calendar_tournament', sourceTournamentId),
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

  const playerValues = playersRows
    .map((row) => {
      const card = row.card;
      if (!card) return null;

      const sourcePlayerId = parseInteger(card.player_id);
      if (!sourcePlayerId || !card.name) return null;

      return {
        id: toEntityId('bs_player', sourcePlayerId),
        sourcePlayerId,
        name: card.name,
        city: card.city ?? null,
        rank: card.rank ?? null,
        rating: parseInteger(card.rating),
        ratingPosition: parseInteger(card.rating_position),
        maxRatingPosition: parseInteger(card.max_rating_position),
        prizePoints: parseInteger(card.prize_points),
        masterPoints: parseInteger(card.master_points),
        onlineMasterPoints: parseInteger(card.online_master_points),
        gamblerNick: card.gambler_nick ?? null,
        bboNick: card.bbo_nick ?? null,
        club: card.club ?? null,
        tournamentsCount: parseInteger(card.tournaments_count) ?? 0,
        profileUrl: card.url ?? null,
        raw: card,
        createdAt: now,
        updatedAt: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const playerTournamentValues = playerTournamentRows.map((row) => ({
    id: toRandomEntityId('bs_player_tournament'),
    sourcePlayerId: row.sourcePlayerId,
    playerName: row.playerName,
    year: row.year,
    masterPoints: row.masterPoints,
    prizePoints: row.prizePoints,
    ratingPoints: row.ratingPoints,
    place: row.place,
    partnerTeam: row.partnerTeam,
    tournament: row.tournament,
    rowOrder: row.sourceRowNumber,
    raw: row.raw,
    createdAt: now,
    updatedAt: now,
  }));

  const ratingValues = ratingRows
    .map((row) => {
      const sourceRatingId = parseInteger(row.id);
      if (!sourceRatingId || !row.name || !row.type_name) return null;

      return {
        id: toEntityId('bs_rating', sourceRatingId),
        sourceRatingId,
        ratingType: String(row.type ?? ''),
        ratingTypeName: row.type_name,
        name: row.name,
        sourceUrl: row.url ?? null,
        snapshotDate: parseSnapshotDate(row.name),
        entriesCount: Array.isArray(row.data) ? row.data.length : 0,
        raw: {
          source: 'ratings_all.json',
          headers: Array.isArray(row.headers) ? row.headers : [],
        },
        createdAt: now,
        updatedAt: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  await db.delete(bridgesportTournaments);
  await upsertInChunks(tournamentValues, async (chunk) => {
    await db.insert(bridgesportTournaments).values(chunk);
  });

  await db.delete(bridgesportCalendarTournaments);
  await upsertInChunks(calendarValues, async (chunk) => {
    await db.insert(bridgesportCalendarTournaments).values(chunk);
  });

  await db.delete(bridgesportPlayers);
  await upsertInChunks(playerValues, async (chunk) => {
    await db.insert(bridgesportPlayers).values(chunk);
  });

  await db.delete(bridgesportPlayerTournaments);
  await upsertInChunks(playerTournamentValues, async (chunk) => {
    await db.insert(bridgesportPlayerTournaments).values(chunk);
  });

  await db.delete(bridgesportRatingSnapshots);
  await upsertInChunks(ratingValues, async (chunk) => {
    await db.insert(bridgesportRatingSnapshots).values(chunk);
  });

  console.log(`BridgeSport ingest complete:
  tournaments: ${tournamentValues.length}
  calendar tournaments: ${calendarValues.length}
  players: ${playerValues.length}
  player tournaments: ${playerTournamentValues.length}
  rating snapshots: ${ratingValues.length}`);
}

ingest()
  .catch((error) => {
    console.error('BridgeSport ingest failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDrizzleConnection();
  });
