import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

const rows = await sql`SELECT id, blocks::text as blocks FROM content_items WHERE id LIKE 'cnt_dupont_%' AND id NOT LIKE 'cnt_dupont_task%' ORDER BY id`;

let fixed = 0;
for (const row of rows) {
  // blocks is a string that may be double-encoded
  let parsed = JSON.parse(row.blocks);

  // If parsed is a string, it's double-encoded - parse again
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      console.log(`${row.id}: cannot parse double-encoded, skipping`);
      continue;
    }
  }

  // If still a string or not an array, skip
  if (!Array.isArray(parsed)) {
    console.log(`${row.id}: not an array after parsing (${typeof parsed}), skipping`);
    continue;
  }

  // Now save properly - use sql tagged template to avoid encoding issues
  await sql`UPDATE content_items SET blocks = ${sql.json(parsed)} WHERE id = ${row.id}`;
  fixed++;
  console.log(`${row.id}: fixed (${parsed.length} blocks)`);
}

console.log(`\nFixed ${fixed} tasks`);
await sql.end();
