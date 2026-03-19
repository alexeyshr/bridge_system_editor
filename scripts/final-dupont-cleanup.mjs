import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

// 1. Fix sort order - add sort_order field or use created_at to order
// Since there's no sort_order column, we'll set created_at sequentially
const allTasks = await sql`SELECT id FROM content_items WHERE id LIKE 'cnt_dupont%' ORDER BY id`;
console.log(`Found ${allTasks.length} tasks total`);

// Build ordered list: task_001, task_002, task_003, then 04-60
const ordered = [];
for (let i = 1; i <= 60; i++) {
  const id = i <= 3
    ? `cnt_dupont_task_${String(i).padStart(3, "0")}`
    : `cnt_dupont_${String(i).padStart(2, "0")}`;
  ordered.push({ num: i, id });
}

// Set created_at sequentially so they sort correctly
const baseDate = new Date("2026-03-18T10:00:00Z");
for (const { num, id } of ordered) {
  const date = new Date(baseDate.getTime() + num * 60000); // 1 min apart
  await sql`UPDATE content_items SET created_at = ${date} WHERE id = ${id}`;
}
console.log("1. Sort order fixed via created_at");

// 2. Clean up tags - remove all existing, add only "розыгрыш"
await sql`DELETE FROM content_tags WHERE content_item_id LIKE 'cnt_dupont%'`;

for (const { num, id } of ordered) {
  await sql`INSERT INTO content_tags (id, content_item_id, tag) VALUES (${`tag_${id}_play`}, ${id}, ${"розыгрыш"})`;
}
console.log("2. Tags cleaned - only 'розыгрыш' remains");

// 3. Add difficulty based on task number (Dupont's tasks get progressively harder)
// Tasks 1-20: easy, 21-40: medium, 41-60: hard
// Store difficulty in summary field
const difficulties = {};
for (let i = 1; i <= 20; i++) difficulties[i] = "★";
for (let i = 21; i <= 40; i++) difficulties[i] = "★★";
for (let i = 41; i <= 60; i++) difficulties[i] = "★★★";

const diffLabels = { "★": "Начальный уровень", "★★": "Средний уровень", "★★★": "Продвинутый уровень" };

for (const { num, id } of ordered) {
  const diff = difficulties[num];
  const label = diffLabels[diff];
  const summary = `${diff} ${label} · Задача на розыгрыш из книги Ги Дюпона «Искусство и магия бриджа»`;
  await sql`UPDATE content_items SET summary = ${summary} WHERE id = ${id}`;
}
console.log("3. Difficulty indicators added to summaries");

console.log("\nDone!");
await sql.end();
