import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");
const [user] = await sql`SELECT id FROM users WHERE email = 'shramkov.alexey@gmail.com'`;
const authorId = user.id;
const spaceId = "space_07dd45972b464fbcbf9ce4ebc2753f50";

function parseVul(v) {
  const vul = v.split("/")[0].trim();
  if (vul === "все" || vul === "all") return "All";
  if (vul === "WE" || vul === "EW") return "EW";
  if (vul === "NS") return "NS";
  return "None";
}
function parseDealer(v) { return v.split("/")[1]?.trim() || "S"; }

const tasks = [
  { num: 14, vul: "все/N", north: { s: "J9", h: "103", d: "TQ432", c: "J642" }, south: { s: "Q42", h: "TQJ98764", d: "6", c: "T" },
    bidding: "S:4H", desc: "Юг играет 4♥. Запад атакует ♣K." },
  { num: 15, vul: "EW/S", north: { s: "10874", h: "K", d: "QJ9732", c: "TQ" }, south: { s: "K3", h: "T962", d: "T1064", c: "K74" },
    bidding: "S:1D N:1S S:1NT N:3D S:3NT", desc: "Юг играет 3БК. Запад атакует ♠В." },
  { num: 16, vul: "EW/N", north: { s: "K6542", h: "TJ7", d: "7", c: "T1062" }, south: { s: "T8", h: "Q109843", d: "108", c: "K93" },
    bidding: "N:1S S:1NT N:2C S:2H N:3H S:4H", desc: "Юг играет 4♥. Запад атакует ♠Д." },
  { num: 37, vul: "NS/S", north: { s: "TKJ", h: "Q952", d: "T8", c: "K763" }, south: { s: "63", h: "TKJ1084", d: "QJ", c: "T84" },
    bidding: "S:1H N:2C S:3H N:3S S:4C N:4NT S:5NT N:6D S:6H", desc: "Юг играет 6♥. Запад атакует ♠7." },
  { num: 38, vul: "NS/N", north: { s: "T85", h: "J84", d: "TK9852", c: "7" }, south: { s: "KJ2", h: "TK102", d: "J4", c: "QJ65" },
    bidding: "N:1D S:1H N:2D S:3NT", desc: "Юг играет 3БК. Запад атакует ♣3. Восток вскакивает тузом и продолжает трефовой десяткой." },
  { num: 39, vul: "EW/W", north: { s: "TKJ732", h: "TQ1076", d: "", c: "J3" }, south: { s: "", h: "543", d: "T1053", c: "TKQ1095" },
    bidding: "W:3D N:4D S:6C", desc: "Юг играет 6♣. Запад атакует ♦K." },
  { num: 40, vul: "NS/N", north: { s: "6", h: "KJ104", d: "QJ1092", c: "J76" }, south: { s: "TQ42", h: "Q62", d: "K53", c: "TK10" },
    bidding: "N:P E:2S S:2NT W:P N:3NT", desc: "Юг играет 3БК. Запад атакует ♠В." },
  { num: 41, vul: "EW/S", north: { s: "10862", h: "J98", d: "TJ94", c: "J6" }, south: { s: "4", h: "TKQ104", d: "K107", c: "TKQ10" },
    bidding: "S:2Cfg N:2D S:2H N:3H S:4C N:4D S:5S N:6H", desc: "Юг играет 6♥. Запад атакует ♠T и продолжает ♥2." },
  { num: 42, vul: "None/W", north: { s: "84", h: "K65", d: "TKQ53", c: "1062" }, south: { s: "TQ3", h: "TQ942", d: "762", c: "87" },
    bidding: "W:1C N:1D E:P S:1H W:P N:2D E:P S:3C W:P N:3H E:P S:4H", desc: "Юг играет 4♥. Запад атакует трефами: туз, король и дама." },
  { num: 43, vul: "EW/N", north: { s: "1072", h: "Q7", d: "TJ", c: "KQJ1084" }, south: { s: "TK", h: "T74", d: "9854", c: "9732" },
    bidding: "N:1C S:2NT N:3NT", desc: "Юг играет 3БК. Запад атакует ♦3." },
  { num: 44, vul: "EW/S", north: { s: "Q42", h: "T864", d: "K5", c: "Q743" }, south: { s: "TKJ109", h: "KJ", d: "T962", c: "105" },
    bidding: "S:1S N:2C S:2D N:2S S:4S", desc: "Юг играет 4♠. Запад атакует ♦4." },
  { num: 45, vul: "NS/S", north: { s: "TK106", h: "T1092", d: "TJ5", c: "K7" }, south: { s: "Q4", h: "KJ873", d: "K1097", c: "T5" },
    bidding: "S:1H N:1S S:2D N:3H S:4C N:4NT S:5NT N:6H", desc: "Юг играет 6♥. Запад атакует ♣Д." },
  { num: 46, vul: "EW/S", north: { s: "952", h: "Q4", d: "J8", c: "KQJ1087" }, south: { s: "T6", h: "K8632", d: "T93", c: "T94" },
    bidding: "S:1H N:2C S:2NT N:3NT", desc: "Юг играет 3БК. Запад атакует ♦K." },
  { num: 47, vul: "EW/S", north: { s: "Q1084", h: "TK64", d: "", c: "TK963" }, south: { s: "TKJ962", h: "J1075", d: "QJ8", c: "" },
    bidding: "S:1S N:2H S:4S N:5NT S:7S", desc: "Юг играет 7♠. Запад атакует ♠3. Восток не дает в масть." },
  { num: 48, vul: "None/S", north: { s: "752", h: "K", d: "Q109", c: "TJ10943" }, south: { s: "TKJ4", h: "Q10983", d: "K65", c: "K" },
    bidding: "S:1H N:2C S:2NT N:3NT", desc: "Юг играет 3БК. Запад атакует ♦7 к девятке стола, Восток сносит тройку." },
  { num: 49, vul: "EW/N", north: { s: "TKQ9", h: "J1072", d: "K753", c: "Q" }, south: { s: "10652", h: "", d: "T104", c: "T96532" },
    bidding: "N:1D S:1S N:3S S:4S", desc: "Юг играет 4♠. Запад атакует ♣В к даме и королю." },
  { num: 50, vul: "EW/S", north: { s: "96", h: "K32", d: "KJ9", c: "T9843" }, south: { s: "K87", h: "", d: "TQ87432", c: "K76" },
    bidding: "S:1D N:2C S:2D N:3D S:5D", desc: "Юг играет 5♦. Запад атакует ♦6. Восток дает в масть." },
  { num: 51, vul: "EW/E", north: { s: "2", h: "T54", d: "T109843", c: "1053" }, south: { s: "TQ53", h: "Q72", d: "KQ", c: "QJ62" },
    bidding: "E:1H S:1NT W:P N:3NT", desc: "Юг играет 3БК. Запад атакует ♥K." },
  { num: 52, vul: "EW/E", north: { s: "J1083", h: "TJ", d: "Q1042", c: "KJ10" }, south: { s: "TQ7642", h: "KQ1053", d: "9", c: "7" },
    bidding: "E:P S:1S W:2D N:4S", desc: "Юг играет 4♠. Запад атакует ♦T и продолжает ♥2." },
  { num: 53, vul: "NS/S", north: { s: "942", h: "TJ10", d: "TJ10", c: "T1087" }, south: { s: "TK6", h: "KQ3", d: "KQ8", c: "Q652" },
    bidding: "S:1C N:1D S:2NT N:6NT", desc: "Юг играет 6БК. Запад атакует ♥9." },
  { num: 54, vul: "все/N", north: { s: "TK", h: "TK", d: "T964", c: "98432" }, south: { s: "QJ1064", h: "QJ107", d: "8532", c: "" },
    bidding: "N:1C S:1S N:2D S:2H N:2NT S:4S", desc: "Юг играет 4♠. Запад атакует ♣K." },
  { num: 55, vul: "EW/N", north: { s: "KQ6", h: "Q1053", d: "T104", c: "TK7" }, south: { s: "T7432", h: "6", d: "K95", c: "QJ94" },
    bidding: "N:1C S:1S N:2NT S:3H N:3S S:4C N:4S S:6S", desc: "Юг играет 6♠. Запад атакует ♠5." },
  { num: 56, vul: "все/S", north: { s: "654", h: "TQ72", d: "Q532", c: "104" }, south: { s: "TK32", h: "K5", d: "K10986", c: "TQ" },
    bidding: "S:1D N:1H S:2S N:3D S:3NT", desc: "Юг играет 3БК. Запад атакует ♥В." },
  { num: 57, vul: "NS/S", north: { s: "Q94", h: "Q963", d: "1075", c: "872" }, south: { s: "6", h: "TKJ1042", d: "TKQ", c: "TQ4" },
    bidding: "S:2Dfg W:2S N:P E:4S S:5H", desc: "Юг играет 5♥. Запад атакует ♠T и продолжает ♥5." },
  { num: 58, vul: "None/S", north: { s: "7642", h: "843", d: "8", c: "TQ543" }, south: { s: "TK", h: "TJ6", d: "T953", c: "K876" },
    bidding: "S:1D W:1S S:1NT N:2NT S:3NT", desc: "Юг играет 3БК. Запад атакует ♠Д." },
  { num: 59, vul: "EW/S", north: { s: "QJ92", h: "KJ43", d: "Q73", c: "106" }, south: { s: "TK10753", h: "T62", d: "T105", c: "4" },
    bidding: "S:1S N:3S S:4S", desc: "Юг играет 4♠. Запад атакует ♠6." },
  { num: 60, vul: "EW/S", north: { s: "Q32", h: "K105", d: "K4", c: "T10763" }, south: { s: "TKJ109", h: "TQ7", d: "T852", c: "5" },
    bidding: "S:1S N:2C S:3S N:3D S:4D N:4C S:5C N:5NT S:6D N:6S", desc: "Юг играет 6♠. Запад атакует ♦В." },
];

let created = 0;
for (const t of tasks) {
  const id = `cnt_dupont_${String(t.num).padStart(2, "0")}`;
  const existing = await sql`SELECT id FROM content_items WHERE id = ${id}`;
  if (existing.length > 0) { console.log(`Task ${t.num} exists, skipping`); continue; }

  const vul = parseVul(t.vul);
  const dealer = parseDealer(t.vul);
  const blocks = [
    { type: "deal", board: t.num, dealer, vulnerability: vul, north: t.north, south: t.south, west: { s: "", h: "", d: "", c: "" }, east: { s: "", h: "", d: "", c: "" } },
    { type: "text", markdown: t.desc },
    { type: "question", question: "Как вы разыграете этот контракт?" },
  ];

  await sql`INSERT INTO content_items (id, space_id, author_user_id, title, summary, format, status, visibility, blocks, created_at, updated_at, updated_by_id)
    VALUES (${id}, ${spaceId}, ${authorId}, ${"Задача " + t.num}, ${"Задача на розыгрыш из книги Ги Дюпона «Искусство и магия бриджа»"}, 'exercise', 'published', 'public', ${JSON.stringify(blocks)}::jsonb, NOW(), NOW(), ${authorId})
    ON CONFLICT (id) DO NOTHING`;
  created++;
  console.log(`Created task ${t.num}`);
}

console.log(`\nDone! Created ${created} tasks.`);
await sql.end();
