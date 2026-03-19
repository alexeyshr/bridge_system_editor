import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

// Get all tasks 4-60
const rows = await sql`SELECT id, title, blocks::text as blocks FROM content_items WHERE id LIKE 'cnt_dupont_%' AND id NOT LIKE 'cnt_dupont_task%' ORDER BY id`;

console.log(`Found ${rows.length} tasks to convert`);

for (const row of rows) {
  const blocks = JSON.parse(row.blocks);
  const newBlocks = [];

  for (const block of blocks) {
    if (block.type === "deal") {
      // Convert {s,h,d,c} → {spades,hearts,diamonds,clubs} under hands
      const convertHand = (h) => ({
        spades: h?.s || "",
        hearts: h?.h || "",
        diamonds: h?.d || "",
        clubs: h?.c || "",
      });
      newBlocks.push({
        type: "deal",
        dealer: block.dealer,
        vulnerability: (block.vulnerability || "None").toLowerCase(),
        hands: {
          north: convertHand(block.north),
          south: convertHand(block.south),
          west: convertHand(block.west || {}),
          east: convertHand(block.east || {}),
        },
      });
    } else if (block.type === "auction") {
      // Convert "S:1H N:3H S:4H" → ["1H","P","3H","P","4H","P","P","P"]
      const seqStr = block.sequence || "";
      const parts = seqStr.split(/\s+/).filter(Boolean);
      const seatOrder = ["W", "N", "E", "S"]; // standard order
      const dealer = block.dealer || "S";

      // Parse seat:bid pairs
      const bids = parts.map(p => {
        const [seat, bid] = p.split(":");
        return { seat, bid: bid === "P" ? "P" : bid };
      });

      // Build full sequence with passes
      const dealerIdx = seatOrder.indexOf(dealer);
      const sequence = [];
      let currentSeatIdx = dealerIdx;
      let bidIdx = 0;

      // Simple approach: just convert to sequence array
      // For each bid, fill in passes for skipped seats
      if (bids.length > 0) {
        for (let i = 0; i < bids.length; i++) {
          const { seat, bid } = bids[i];
          const targetIdx = seatOrder.indexOf(seat);

          // Fill passes until we reach the target seat
          while (currentSeatIdx !== targetIdx) {
            sequence.push("P");
            currentSeatIdx = (currentSeatIdx + 1) % 4;
          }

          sequence.push(bid.replace(/бк/i, "NT").replace(/fg/i, "").replace(/Cfg/i, "").replace(/Dfg/i, ""));
          currentSeatIdx = (currentSeatIdx + 1) % 4;
        }

        // Add closing passes (3 passes to end auction)
        let passCount = 0;
        while (passCount < 3) {
          sequence.push("P");
          passCount++;
        }
      }

      // Find the description from text block
      const textBlock = blocks.find(b => b.type === "text");

      newBlocks.push({
        type: "auction",
        startingSeat: dealer,
        sequence: sequence,
        notes: textBlock?.markdown || "",
      });
    } else if (block.type === "text") {
      // Convert text to intro block (first text) or keep
      if (newBlocks.length === 0) {
        // Add intro text first
        newBlocks.push({
          type: "text",
          markdown: "Из книги **Ги Дюпон** — *Искусство и магия бриджа*. Задача на розыгрыш.",
        });
      }
      // Skip the description text as it goes into auction notes
    } else if (block.type === "question") {
      newBlocks.push({
        type: "question",
        question: block.question || "Как разыгрывающий должен вести розыгрыш?",
      });
      // Add empty answer block
      newBlocks.push({
        type: "answer",
        text: "*(Решение будет добавлено позже)*",
      });
    } else {
      newBlocks.push(block);
    }
  }

  // Update in DB
  await sql`UPDATE content_items SET blocks = ${JSON.stringify(newBlocks)}::jsonb WHERE id = ${row.id}`;
  console.log(`Updated ${row.id} (${row.title})`);
}

console.log("\nDone!");
await sql.end();
