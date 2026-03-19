import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

// Check what broken data looks like
const rows = await sql`SELECT id, blocks::text as raw FROM content_items WHERE id IN ('cnt_dupont_task_001', 'cnt_dupont_04')`;

for (const r of rows) {
  const parsed = JSON.parse(r.raw);
  console.log(`\n${r.id}:`);
  console.log("  typeof:", typeof parsed);
  console.log("  isArray:", Array.isArray(parsed));
  if (Array.isArray(parsed)) {
    console.log("  length:", parsed.length);
    console.log("  first elem type:", typeof parsed[0]);
    if (typeof parsed[0] === "string") {
      // It's array of chars - join them
      const joined = parsed.join("");
      console.log("  joined length:", joined.length);
      console.log("  joined first 150:", joined.slice(0, 150));
    } else {
      console.log("  first elem:", JSON.stringify(parsed[0]).slice(0, 100));
    }
  }
}

await sql.end();
