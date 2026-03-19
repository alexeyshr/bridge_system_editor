import postgres from "postgres";
import { readFileSync } from "fs";

const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");
const spaceId = "space_eeb2a304a4714662891020a2ba4406db";
const authorId = (await sql`SELECT id FROM users LIMIT 1`)[0].id;

// Load all JSON files
const files = [
  "lawrence_articles.json",
  "lawrence_ch3_ch4.json",
  "lawrence_ch5_ch6_ch7.json",
];

let allArticles = [];
for (const f of files) {
  const data = JSON.parse(readFileSync(`C:/Users/shram/Desktop/BRIDGE/bridge_system_editor_sync/${f}`, "utf8"));
  allArticles = allArticles.concat(data);
  console.log(`Loaded ${data.length} articles from ${f}`);
}

console.log(`\nTotal: ${allArticles.length} articles`);

// Check first article format
const first = allArticles[0];
console.log(`\nFirst article: ${first.id} - ${first.title}`);
const deal = first.blocks?.find(b => b.type === "deal");
if (deal) {
  console.log("Deal format:", Object.keys(deal).join(", "));
  if (deal.north) console.log("Uses north.s format");
  if (deal.hands) console.log("Uses hands.north.spades format");
}

// Convert deal format if needed and insert
const diffLabels = {
  1: "★ Начальный уровень",
  2: "★ Начальный уровень",
  3: "★★ Средний уровень",
  4: "★★ Средний уровень",
  5: "★★★ Продвинутый уровень",
  6: "★★★ Продвинутый уровень",
  7: "★★★ Продвинутый уровень",
};

// Skip ch1 articles that already exist
const existing = new Set(["cnt_lawrence_ch1_intro", "cnt_lawrence_ch1_ex1", "cnt_lawrence_ch1_ex2"]);

let created = 0;
const baseTime = new Date("2026-03-19T12:00:00Z");

for (const [idx, article] of allArticles.entries()) {
  if (existing.has(article.id)) {
    console.log(`SKIP: ${article.id} (already exists)`);
    continue;
  }

  // Convert blocks - ensure deal format is hands.north.spades
  const blocks = (article.blocks || []).map(block => {
    if (block.type === "deal") {
      // Check if using short format (north.s) vs long format (hands.north.spades)
      if (block.north && !block.hands) {
        const convertHand = (h) => ({
          spades: h?.s || "",
          hearts: h?.h || "",
          diamonds: h?.d || "",
          clubs: h?.c || "",
        });
        return {
          type: "deal",
          dealer: block.dealer || "S",
          vulnerability: (block.vulnerability || "none").toLowerCase(),
          hands: {
            north: convertHand(block.north),
            south: convertHand(block.south),
            west: convertHand(block.west || {}),
            east: convertHand(block.east || {}),
          },
        };
      }
      // Already in correct format
      return block;
    }
    return block;
  });

  const ch = article.chapter || 1;
  const summary = `${diffLabels[ch] || "★"} · Как распознать карты противника · Майк Лоуренс`;
  const createdAt = new Date(baseTime.getTime() + idx * 60000);

  try {
    await sql`INSERT INTO content_items (id, space_id, author_user_id, title, summary, format, visibility, status, blocks, updated_by_id, created_at)
      VALUES (${article.id}, ${spaceId}, ${authorId}, ${article.title}, ${summary}, 'exercise', 'public', 'published', ${sql.json(blocks)}, ${authorId}, ${createdAt})
      ON CONFLICT (id) DO UPDATE SET title = ${article.title}, summary = ${summary}, blocks = ${sql.json(blocks)}, created_at = ${createdAt}`;

    await sql`INSERT INTO content_tags (id, content_item_id, tag) VALUES (${`tag_${article.id}_analysis`}, ${article.id}, 'анализ') ON CONFLICT (id) DO NOTHING`;

    created++;
    console.log(`Created: ${article.id} - ${article.title}`);
  } catch (e) {
    console.log(`ERROR: ${article.id} - ${e.message}`);
  }
}

console.log(`\nDone! Created ${created} articles.`);
await sql.end();
