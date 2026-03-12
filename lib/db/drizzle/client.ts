import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './schema';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

type GlobalDrizzle = {
  postgresClient?: postgres.Sql;
  drizzleDb?: DrizzleDb;
};

const globalForDrizzle = globalThis as unknown as GlobalDrizzle;

function createMissingDbProxy(): DrizzleDb {
  return new Proxy({} as DrizzleDb, {
    get() {
      throw new Error('DATABASE_URL is required to initialize Drizzle');
    },
  });
}

function createDrizzleDb(): DrizzleDb {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return createMissingDbProxy();
  }

  const postgresClient = postgres(connectionString, {
    max: 10,
    prepare: false,
  });

  const db = drizzle(postgresClient, { schema });
  globalForDrizzle.postgresClient = postgresClient;

  return db;
}

export const db = globalForDrizzle.drizzleDb ?? createDrizzleDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDrizzle.drizzleDb = db;
}

export async function closeDrizzleConnection(): Promise<void> {
  if (!globalForDrizzle.postgresClient) return;
  await globalForDrizzle.postgresClient.end({ timeout: 5 });
  globalForDrizzle.postgresClient = undefined;
  if (process.env.NODE_ENV !== 'production') {
    globalForDrizzle.drizzleDb = undefined;
  }
}
