import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

const rows = await sql`SELECT id, blocks FROM content_items WHERE id LIKE 'cnt_dupont_%' AND id NOT LIKE 'cnt_dupont_task%' ORDER BY id`;

let fixed = 0;
for (const row of rows) {
  const blocks = row.blocks;
  if (!Array.isArray(blocks)) { console.log(`${row.id}: SKIP not array`); continue; }

  let changed = false;
  const newBlocks = blocks.map(block => {
    if (block.type === "deal" && block.north && !block.hands) {
      changed = true;
      const convertHand = (h) => ({
        spades: h?.s || "",
        hearts: h?.h || "",
        diamonds: h?.d || "",
        clubs: h?.c || "",
      });
      return {
        type: "deal",
        dealer: block.dealer,
        vulnerability: (block.vulnerability || "None").toLowerCase().replace("none", "none").replace("ew", "ew").replace("ns", "ns").replace("all", "all"),
        board: block.board,
        hands: {
          north: convertHand(block.north),
          south: convertHand(block.south),
          west: convertHand(block.west),
          east: convertHand(block.east),
        },
      };
    }
    if (block.type === "auction" && typeof block.sequence === "string") {
      changed = true;
      // Convert "S:1H N:3H S:4H" to array ["1H","P","3H","P","4H","P","P","P"]
      const seatOrder = ["W", "N", "E", "S"];
      const dealer = block.dealer || "S";
      const parts = block.sequence.split(/\s+/).filter(Boolean);
      const bids = parts.map(p => { const [seat, bid] = p.split(":"); return { seat, bid }; });

      const dealerIdx = seatOrder.indexOf(dealer);
      const seq = [];
      let currentIdx = dealerIdx;

      for (const { seat, bid } of bids) {
        const targetIdx = seatOrder.indexOf(seat);
        while (currentIdx !== targetIdx) {
          seq.push("P");
          currentIdx = (currentIdx + 1) % 4;
        }
        seq.push(bid);
        currentIdx = (currentIdx + 1) % 4;
      }
      // Add 3 final passes
      seq.push("P", "P", "P");

      return {
        type: "auction",
        startingSeat: dealer,
        sequence: seq,
        notes: block.notes || "",
      };
    }
    return block;
  });

  if (changed) {
    await sql`UPDATE content_items SET blocks = ${sql.json(newBlocks)} WHERE id = ${row.id}`;
    fixed++;
    console.log(`${row.id}: converted (${newBlocks.map(b=>b.type).join(", ")})`);
  } else {
    console.log(`${row.id}: already OK`);
  }
}

console.log(`\nConverted ${fixed} tasks`);
await sql.end();
