import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

const rows = await sql`SELECT id, blocks::text as raw FROM content_items WHERE id LIKE 'cnt_dupont%' ORDER BY id`;

let fixed = 0;
for (const r of rows) {
  let parsed = JSON.parse(r.raw);

  // Case 1: it's a string (task 1-3) - parse it
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  // Case 2: it's array of single chars (broken tasks 4-60) - join and parse
  if (Array.isArray(parsed) && parsed.length > 10 && typeof parsed[0] === "string" && parsed[0].length === 1) {
    const joined = parsed.join("");
    parsed = JSON.parse(joined);
  }

  // Now parsed should be a proper array of block objects
  if (!Array.isArray(parsed) || parsed.length === 0) {
    console.log(`${r.id}: SKIP - not an array`);
    continue;
  }

  // Verify first element has type
  if (!parsed[0].type) {
    console.log(`${r.id}: SKIP - first elem has no type`);
    continue;
  }

  // Save properly using sql.json()
  await sql`UPDATE content_items SET blocks = ${sql.json(parsed)} WHERE id = ${r.id}`;
  fixed++;
  console.log(`${r.id}: OK (${parsed.length} blocks: ${parsed.map(b => b.type).join(", ")})`);
}

console.log(`\nFixed ${fixed} tasks`);
await sql.end();
