import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

// Solutions extracted from PDF pages
// Format: taskNum -> { west, east, question, answer }
const solutions = {
  4: {
    west: {s:"K852", h:"B54", d:"T986", c:"86"},
    east: {s:"S543", h:"", d:"DB1032", c:"J974"},
    question: "Как разыграть после атаки ♠K и продолжения ♠Q?",
    answer: "Нужно безопасно разыграть трефу. Берём второй ход пиками, собираем козырей, затем играем туз и короля треф. Если трефа делится 3-2, десятка на столе обеспечивает снос бубны."
  },
  5: {
    west: {s:"92", h:"8973", d:"TB8", c:"9654"},
    east: {s:"TB853", h:"", d:"S4", c:"DJ1073"},
    question: "Как разыграть 3NT после атаки ♠9?",
    answer: "Торговля и атака показывают что Восток держит пять пик с тузом и валетом. Можно безопасно пустить пиковой семёркой. Восток пустит, а когда он получит ход по бубне, вторая пиковая дама на столе обеспечит задержку."
  },
  6: {
    west: {s:"DB3", h:"752", d:"DB2", c:"TKB543"},
    east: {s:"K10974", h:"", d:"TK95", c:"DB106"},
    question: "Что произойдёт если взять пикового короля тузом?",
    answer: "Если взять ♠A — разыгрывающий сядет. Он заблокирован тузом на столе и не сможет вернуться в руку. Нужно пропустить ♠K, затем пустить к даме и разблокироваться червовым тузом."
  },
  7: {
    west: {s:"TJ63", h:"972", d:"K86", c:"T102"},
    east: {s:"T10653", h:"7532", d:"", c:"KB7"},
    question: "Как собрать козырей при раскладе 4-2?",
    answer: "Нельзя просто собирать козырей — нужен безопасный импас трефового валета. Достаточно сыграть мелким козырем с двух рук на третьем ходе, обеспечив контракт при раскладе 4-2."
  },
  8: {
    west: {s:"K852", h:"B74", d:"U742", c:"TJ114"},
    east: {s:"K6", h:"U742", d:"TJ104", c:"K852"},
    question: "Как безопасно разыграть бубну в малом шлеме?",
    answer: "Разыгрывающий принимает атаку, собирает козырей, сносит одну черву и одну трефу, затем продолжает пятёркой бубен. При любом отходе Запада контракт обеспечен."
  },
  9: {
    west: {s:"K7", h:"TB85", d:"DJ85", c:"K107632"},
    east: {s:"T4", h:"9842", d:"TB95", c:"2"},
    question: "Как нарушить коммуникацию защиты при атаке ♣2?",
    answer: "Двойка треф — несомненно сингл. Нельзя играть козырем сразу — Запад снимет козырем мелкую бубну. Нужно разорвать коммуникацию между оппонентами по бубне."
  },
};

// Update each task
for (const [numStr, sol] of Object.entries(solutions)) {
  const num = parseInt(numStr);
  const id = `cnt_dupont_${String(num).padStart(2, "0")}`;

  const rows = await sql`SELECT blocks FROM content_items WHERE id = ${id}`;
  if (!rows.length) { console.log(`Skip ${id} — not found`); continue; }

  const blocks = rows[0].blocks;

  // Update deal block with W/E hands
  const dealIdx = blocks.findIndex(b => b.type === "deal");
  if (dealIdx >= 0) {
    const deal = blocks[dealIdx];
    // Update hands format
    if (deal.hands) {
      deal.hands.west = { spades: sol.west.s, hearts: sol.west.h, diamonds: sol.west.d, clubs: sol.west.c };
      deal.hands.east = { spades: sol.east.s, hearts: sol.east.h, diamonds: sol.east.d, clubs: sol.east.c };
    } else {
      deal.west = sol.west;
      deal.east = sol.east;
    }
  }

  // Update question
  const qIdx = blocks.findIndex(b => b.type === "question");
  if (qIdx >= 0) {
    blocks[qIdx].question = sol.question;
  }

  // Add answer block if missing
  const aIdx = blocks.findIndex(b => b.type === "answer");
  if (aIdx < 0) {
    blocks.push({ type: "answer", text: sol.answer });
  } else {
    blocks[aIdx].text = sol.answer;
  }

  await sql`UPDATE content_items SET blocks = ${JSON.stringify(blocks)}::jsonb WHERE id = ${id}`;
  console.log(`Updated ${id} (task ${num})`);
}

console.log("\nDone!");
await sql.end();
