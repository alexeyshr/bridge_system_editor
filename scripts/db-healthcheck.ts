import postgres from 'postgres';

const requiredTables = [
  'users',
  'auth_accounts',
  'bidding_systems',
  'bidding_nodes',
  'system_shares',
  'share_invites',
  'system_revisions',
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1, prepare: false });
  try {
    const ping = await sql`select 1 as ok`;
    if (!ping[0]?.ok) {
      throw new Error('DB ping failed');
    }

    const rows = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ${sql(requiredTables)}
    `;

    const existing = new Set(rows.map((row) => String(row.table_name)));
    const missing = requiredTables.filter((table) => !existing.has(table));

    if (missing.length > 0) {
      console.error('DB healthcheck failed. Missing tables:', missing.join(', '));
      process.exit(1);
    }

    console.log('DB healthcheck passed');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error('DB healthcheck failed:', error);
  process.exit(1);
});
