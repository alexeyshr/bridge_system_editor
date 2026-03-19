import postgres from "postgres";
import { randomUUID } from "crypto";

const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

// Get author user id
const [user] = await sql`SELECT id FROM users WHERE email = 'shramkov.alexey@gmail.com'`;
const authorId = user?.id;
if (!authorId) { console.error("Author not found"); process.exit(1); }

// Get space id
const [space] = await sql`SELECT id FROM spaces WHERE slug = 'personal'`;
const spaceId = space?.id || "space_07dd45972b464fbcbf9ce4ebc2753f50";

// Russian card notation → standard
// К=K, Д=Q, В=J, Т=T(10)
// Vulnerability: WE/S → EW, все/S → All, NS/S → NS, —/S → None
function parseVul(v) {
  const vul = v.split("/")[0].trim();
  if (vul === "все" || vul === "all") return "All";
  if (vul === "WE" || vul === "EW") return "EW";
  if (vul === "NS") return "NS";
  if (vul === "—" || vul === "-" || vul === "") return "None";
  return "None";
}

function parseDealer(v) {
  const d = v.split("/")[1]?.trim();
  return d || "S";
}

function convertCards(rus) {
  return rus.replace(/К/g, "K").replace(/Д/g, "Q").replace(/В/g, "J").replace(/Т/g, "T");
}

const tasks = [
  // Task 4
  { num: 4, vul: "WE/S", north: { s: "T109", h: "Q983", d: "74", c: "KJ52" }, south: { s: "76", h: "TK10762", d: "K5", c: "T86" },
    bidding: "S:1H N:3H S:4H", desc: "Юг играет 4♥. Запад атакует пиковым королем. Разыгрывающий пускает. Запад продолжает пиковой дамой." },
  // Task 5
  { num: 5, vul: "WE/S", north: { s: "Q53", h: "A84", d: "KJ52", c: "J63" }, south: { s: "AK10974", h: "K5", d: "A64", c: "K4" },
    bidding: "S:1S N:3S S:4S", desc: "Юг играет 4♠. Запад атакует ♣Д." },
  // Task 6
  { num: 6, vul: "NS/S", north: { s: "K32", h: "AK5", d: "A952", c: "Q43" }, south: { s: "AQJ1085", h: "74", d: "K3", c: "A72" },
    bidding: "S:1S N:3S S:6S", desc: "Юг играет 6♠. Запад атакует ♥Д." },
  // Task 7
  { num: 7, vul: "EW/S", north: { s: "AK8", h: "972", d: "AKQ5", c: "K84" }, south: { s: "QJ10963", h: "A3", d: "72", c: "AQ3" },
    bidding: "S:1S N:4S", desc: "Юг играет 4♠. Запад атакует ♥K. Козыри лежат 2-2." },
  // Task 8
  { num: 8, vul: "All/S", north: { s: "K73", h: "AQ5", d: "10652", c: "KQ4" }, south: { s: "AQ10842", h: "63", d: "AKJ", c: "A5" },
    bidding: "S:2C N:2D S:2S N:3S S:4NT N:5D S:6S", desc: "Юг играет 6♠. Запад атакует ♥В." },
  // Task 9
  { num: 9, vul: "None/S", north: { s: "QJ3", h: "1062", d: "A95", c: "AQ94" }, south: { s: "AK10954", h: "4", d: "K42", c: "K72" },
    bidding: "S:1S N:4S", desc: "Юг играет 4♠. Запад атакует ♥T." },
  // Task 10
  { num: 10, vul: "None/S", north: { s: "K94", h: "Q1086", d: "8542", c: "97" }, south: { s: "AQJ10853", h: "74", d: "AQ", c: "A5" },
    bidding: "S:2C N:2D S:2S N:3S S:4S", desc: "Юг играет 4♠. Запад атакует ♣K." },
  // Task 11
  { num: 11, vul: "All/S", north: { s: "J53", h: "K6", d: "Q104", c: "6642" }, south: { s: "97", h: "9753", d: "AKJ63", c: "AK" },
    bidding: "S:1D N:1NT S:3NT", desc: "Юг играет 3БК. Запад атакует ♠6." },
  // Task 12
  { num: 12, vul: "EW/S", north: { s: "K94", h: "A85", d: "K742", c: "1062" }, south: { s: "A73", h: "KQ4", d: "AQ1083", c: "K5" },
    bidding: "S:1D N:3D S:3NT", desc: "Юг играет 3БК. Запад атакует ♣Q." },
  // Task 13
  { num: 13, vul: "All/S", north: { s: "A1054", h: "KQ2", d: "J7", c: "9843" }, south: { s: "KJ9", h: "AT4", d: "AQ1053", c: "K2" },
    bidding: "S:1D N:1S S:2NT N:3NT", desc: "Юг играет 3БК. Запад атакует ♣5." },
  // Task 17
  { num: 17, vul: "None/W", north: { s: "J964", h: "93", d: "J753", c: "KJ2" }, south: { s: "TKQT075", h: "4", d: "T84", c: "T73" },
    bidding: "E:4H S:4S", desc: "Юг играет 4♠. Запад атакует ♥В. Восток вскакивает дамой и продолжает королем." },
  // Task 18
  { num: 18, vul: "EW/S", north: { s: "K10842", h: "K3", d: "K7", c: "Q642" }, south: { s: "TQJ63", h: "104", d: "T5", c: "K753" },
    bidding: "S:1S N:4S", desc: "Юг играет 4♠. Запад атакует ♥T и продолжает червой." },
  // Task 19
  { num: 19, vul: "All/S", north: { s: "K93", h: "J8", d: "K8632", c: "TJ10" }, south: { s: "TQ108752", h: "TK3", d: "7", c: "64" },
    bidding: "S:1S N:2D S:3S N:4S S:5H N:6S", desc: "Юг играет 6♠. Запад атакует ♥2 к валету и даме." },
  // Task 20
  { num: 20, vul: "EW/S", north: { s: "T75", h: "543", d: "KQ104", c: "J63" }, south: { s: "93", h: "TKJ9762", d: "2", c: "TK5" },
    bidding: "S:1H N:1NT S:4H", desc: "Юг играет 4♥. Запад атакует ♠К." },
  // Task 21
  { num: 21, vul: "All/S", north: { s: "Q97", h: "73", d: "1098542", c: "Q10" }, south: { s: "TKJ643", h: "84", d: "T73", c: "TK" },
    bidding: "S:2C N:2D S:2S N:4S", desc: "Юг играет 4♠. Запад атакует ♥T и продолжает ♥K, затем переключается на козырь (козыри 2-2)." },
  // Task 22
  { num: 22, vul: "All/S", north: { s: "J8543", h: "3", d: "QJ32", c: "Q84" }, south: { s: "TAKQ", h: "T74", d: "T1064", c: "T103" },
    bidding: "S:2NT N:3H S:3S N:3NT S:4S", desc: "Юг играет 4♠. Запад атакует пиковой десяткой и сносит боковую масть на втором кругу козырей." },
  // Task 23
  { num: 23, vul: "All/S", north: { s: "Q6", h: "Q83", d: "TK", c: "QJ10972" }, south: { s: "T10854", h: "TK6542", d: "5", c: "T" },
    bidding: "S:1H N:2C S:2S N:3H S:3S N:4D S:4NT N:5D S:5NT N:6D S:6H", desc: "Юг разыгрывает 6♥. Запад атакует ♦В." },
  // Task 24
  { num: 24, vul: "None/S", north: { s: "T6", h: "106", d: "T97542", c: "932" }, south: { s: "Q7", h: "TK52", d: "KQ", c: "TJ1085" },
    bidding: "S:1C N:1D S:2H N:2S S:3S N:3NT", desc: "Юг разыгрывает 3БК. Запад атакует ♠4. Дама Юга получает взятку." },
  // Task 25
  { num: 25, vul: "EW/S", north: { s: "Q74", h: "6", d: "Q52", c: "TK7642" }, south: { s: "TK8652", h: "Q83", d: "107", c: "105" },
    bidding: "S:2S N:4S", desc: "Юг играет 4♠. Запад атакует ♠3." },
  // Task 26
  { num: 26, vul: "NS/S", north: { s: "K106", h: "1097", d: "T102", c: "KQ105" }, south: { s: "TJ3", h: "K8", d: "KJ74", c: "T762" },
    bidding: "S:1NT N:3NT", desc: "Юг играет 3БК. Запад атакует ♥3, Восток берет тузом и продолжает ♥5." },
  // Task 27
  { num: 27, vul: "NS/E", north: { s: "TJ6", h: "KJ104", d: "J2", c: "TJ83" }, south: { s: "Q109732", h: "73", d: "K8", c: "KQ5" },
    bidding: "E:1D S:1S W:2D N:4S", desc: "Юг играет 4♠. Запад атакует ♦3." },
  // Task 28
  { num: 28, vul: "All/S", north: { s: "KJ", h: "9876", d: "KQ32", c: "K75" }, south: { s: "TQ63", h: "T52", d: "T86", c: "TQ6" },
    bidding: "S:2NT N:3C S:3S N:4D S:4H N:6NT", desc: "Юг играет 6БК. Запад атакует ♥К." },
  // Task 29
  { num: 29, vul: "EW/S", north: { s: "KQ95", h: "Q74", d: "KJ3", c: "762" }, south: { s: "TJ10874", h: "8", d: "T62", c: "TQ4" },
    bidding: "S:1S N:3S S:4S", desc: "Юг играет 4♠. Запад атакует ♥T и продолжает ♦10." },
  // Task 30
  { num: 30, vul: "EW/S", north: { s: "T86", h: "J1098532", d: "J", c: "74" }, south: { s: "K742", h: "TQ4", d: "T73", c: "K85" },
    bidding: "S:1NT N:2D S:2H N:4H", desc: "Юг играет 4♥. Запад атакует ♦K." },
  // Task 31
  { num: 31, vul: "None/S", north: { s: "K543", h: "KQ1062", d: "", c: "K742" }, south: { s: "TJ2", h: "TJ98", d: "TJ7", c: "TJ8" },
    bidding: "S:2NT N:3C S:3S N:4C S:4D N:4H S:6H", desc: "Юг играет 6♥. Запад атакует ♦К." },
  // Task 32
  { num: 32, vul: "NS/S", north: { s: "642", h: "J6", d: "QJ63", c: "T1084" }, south: { s: "TK87", h: "TKQ1092", d: "8", c: "Q3" },
    bidding: "S:1H N:1NT S:2S N:2NT S:4H", desc: "Юг играет 4♥. Запад атакует ♣7." },
  // Task 33
  { num: 33, vul: "All/S", north: { s: "9532", h: "Q64", d: "TK8", c: "932" }, south: { s: "TKQJ10", h: "K7", d: "Q5", c: "TK85" },
    bidding: "S:2Cfg N:2D S:2S N:3S S:4D N:4S S:5S", desc: "Юг играет 6♠. Запад атакует ♣Д. Запад не дает в масть на первый же козырной ход." },
  // Task 34
  { num: 34, vul: "None/S", north: { s: "2", h: "TK1063", d: "K753", c: "T95" }, south: { s: "TQ5", h: "42", d: "T104", c: "KJ642" },
    bidding: "S:1C N:1H S:1NT N:2C S:2D N:3D S:3NT", desc: "Юг играет 3БК. Запад атакует ♠10 к королю Востока." },
  // Task 35
  { num: 35, vul: "None/S", north: { s: "Q632", h: "73", d: "KQ6", c: "T654" }, south: { s: "TKJ5", h: "TK84", d: "T8", c: "J73" },
    bidding: "S:1NT N:3C S:3NT N:4D S:4S N:5C S:5S N:6S", desc: "Юг играет 6♠. Запад атакует ♦4." },
  // Task 36
  { num: 36, vul: "EW/N", north: { s: "1098", h: "Q76", d: "T8762", c: "96" }, south: { s: "TKQJ765", h: "", d: "J43", c: "K82" },
    bidding: "N:P E:P S:4S W:P N:P E:P", desc: "Юг играет 4♠. Запад атакует ♥T." },
];

// Create content items
let created = 0;
for (const t of tasks) {
  const id = `cnt_dupont_${String(t.num).padStart(2, "0")}`;

  // Check if exists
  const existing = await sql`SELECT id FROM content_items WHERE id = ${id}`;
  if (existing.length > 0) {
    console.log(`Task ${t.num} already exists, skipping`);
    continue;
  }

  const vul = parseVul(t.vul);
  const dealer = parseDealer(t.vul);

  const blocks = [
    { type: "deal", board: t.num, dealer, vulnerability: vul,
      north: t.north, south: t.south,
      west: { s: "", h: "", d: "", c: "" }, east: { s: "", h: "", d: "", c: "" } },
    { type: "text", markdown: t.desc },
    { type: "question", question: "Как вы разыграете этот контракт?" },
  ];

  if (t.bidding) {
    const auctionBlock = { type: "auction", dealer, vulnerability: vul, sequence: t.bidding, notes: "" };
    blocks.splice(1, 0, auctionBlock);
  }

  const title = `Задача ${t.num}`;
  const summary = `Задача на розыгрыш из книги Ги Дюпона «Искусство и магия бриджа»`;

  await sql`INSERT INTO content_items (id, space_id, author_user_id, title, summary, format, status, visibility, blocks, created_at, updated_at, updated_by_id)
    VALUES (${id}, ${spaceId}, ${authorId}, ${title}, ${summary}, 'exercise', 'published', 'public', ${JSON.stringify(blocks)}::jsonb, NOW(), NOW(), ${authorId})
    ON CONFLICT (id) DO NOTHING`;

  created++;
  console.log(`Created task ${t.num}`);
}

console.log(`\nDone! Created ${created} tasks.`);
await sql.end();
