import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

// Auction data from agent - need to expand to full sequences with passes
const auctions = [
  { taskNum: 14, dealer: "S", bids: ["4H","P","P","P"] },
  { taskNum: 15, dealer: "S", bids: ["1D","P","1S","P","1NT","P","3D","P","3NT","P","P","P"] },
  { taskNum: 16, dealer: "N", bids: ["1S","P","1NT","P","2C","P","2H","P","3H","P","4H","P","P","P"] },
  { taskNum: 37, dealer: "S", bids: ["1H","P","2C","P","3H","P","3S","P","4C","P","4NT","P","5H","P","5NT","P","6D","P","6H","P","P","P"] },
  { taskNum: 38, dealer: "N", bids: ["1D","P","1H","P","2D","P","3NT","P","P","P"] },
  { taskNum: 39, dealer: "W", bids: ["3D","4D","P","6C","P","P","P"] },
  { taskNum: 40, dealer: "N", bids: ["P","2S","2NT","P","3S","P","3NT","P","P","P"] },
  { taskNum: 41, dealer: "S", bids: ["2C","P","2D","P","2H","P","3H","P","4C","P","4D","P","4NT","P","5NT","P","6H","P","P","P"] },
  { taskNum: 42, dealer: "W", bids: ["1C","1D","P","1H","P","2D","P","3C","P","3H","P","4H","P","P","P"] },
  { taskNum: 43, dealer: "N", bids: ["1C","P","2NT","P","3NT","P","P","P"] },
  { taskNum: 44, dealer: "S", bids: ["1S","P","2C","P","2D","P","2S","P","4S","P","P","P"] },
  { taskNum: 45, dealer: "S", bids: ["1H","P","1S","P","2D","P","3H","P","4C","P","4NT","P","5D","P","5NT","P","6H","P","P","P"] },
  { taskNum: 46, dealer: "S", bids: ["1H","P","2C","P","2NT","P","3NT","P","P","P"] },
  { taskNum: 47, dealer: "S", bids: ["1S","P","2C","P","2H","P","3S","P","4S","P","5NT","P","7S","P","P","P"] },
  { taskNum: 48, dealer: "S", bids: ["1H","P","2C","P","2NT","P","3NT","P","P","P"] },
  { taskNum: 49, dealer: "N", bids: ["1D","P","1S","P","3S","P","4S","P","P","P"] },
  { taskNum: 50, dealer: "S", bids: ["1D","P","2C","P","2D","P","3D","P","5D","P","P","P"] },
  { taskNum: 51, dealer: "E", bids: ["1H","1NT","P","3NT","P","P","P"] },
  { taskNum: 52, dealer: "E", bids: ["P","1S","2D","4S","P","P","P"] },
  { taskNum: 53, dealer: "S", bids: ["1C","P","1D","P","2NT","P","6NT","P","P","P"] },
  { taskNum: 54, dealer: "N", bids: ["1C","P","1S","P","2D","P","2H","P","2NT","P","3S","P","4S","P","P","P"] },
  { taskNum: 55, dealer: "N", bids: ["1C","P","1S","P","2NT","P","3C","P","3H","P","3S","P","4C","P","4D","P","4S","P","6S","P","P","P"] },
  { taskNum: 56, dealer: "S", bids: ["1D","P","1H","P","2S","P","3D","P","3NT","P","P","P"] },
  { taskNum: 57, dealer: "S", bids: ["2D","2S","P","4S","5H","P","P","P"] },
  { taskNum: 58, dealer: "S", bids: ["1D","1S","P","P","1NT","P","2NT","P","3NT","P","P","P"] },
  { taskNum: 59, dealer: "S", bids: ["1S","P","3S","P","4S","P","P","P"] },
  { taskNum: 60, dealer: "S", bids: ["1S","P","2C","P","3D","P","3S","P","4C","P","4NT","P","5C","P","5NT","P","6D","P","6S","P","P","P"] },
];

for (const a of auctions) {
  const id = `cnt_dupont_${String(a.taskNum).padStart(2, "0")}`;
  const row = await sql`SELECT blocks FROM content_items WHERE id = ${id}`;
  if (!row.length) { console.log(`${id}: NOT FOUND`); continue; }

  const blocks = row[0].blocks;
  if (!Array.isArray(blocks)) { console.log(`${id}: blocks not array`); continue; }

  // Check if auction already exists
  if (blocks.some(b => b.type === "auction")) {
    console.log(`${id}: already has auction, skipping`);
    continue;
  }

  // Insert auction block after deal block
  const dealIdx = blocks.findIndex(b => b.type === "deal");
  const auctionBlock = {
    type: "auction",
    startingSeat: a.dealer,
    sequence: a.bids,
    notes: "",
  };

  const newBlocks = [...blocks];
  newBlocks.splice(dealIdx + 1, 0, auctionBlock);

  await sql`UPDATE content_items SET blocks = ${sql.json(newBlocks)} WHERE id = ${id}`;
  console.log(`${id}: added auction (${a.bids.length} bids, dealer ${a.dealer})`);
}

console.log("\nDone!");
await sql.end();
