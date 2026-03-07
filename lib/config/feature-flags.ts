export type DbDriver = 'prisma' | 'drizzle';
export type ApiTransport = 'rest' | 'trpc';

function parseDbDriver(value: string | undefined): DbDriver {
  return value === 'drizzle' ? 'drizzle' : 'prisma';
}

function parseApiTransport(value: string | undefined): ApiTransport {
  return value === 'trpc' ? 'trpc' : 'rest';
}

function parseBooleanFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

export const featureFlags = {
  dbDriver: parseDbDriver(process.env.DB_DRIVER),
  apiTransport: parseApiTransport(process.env.API_TRANSPORT),
  dualWriteEnabled: parseBooleanFlag(process.env.DUAL_WRITE_ENABLED, false),
} as const;
