import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

const betterTitles = {
  7: "Безопасная козырная отдача",
  9: "Разрыв коммуникации защиты",
  10: "Эндплей пиковой дамой",
  14: "Приём Белладонны",
  17: "Эндплей на Востоке",
  22: "Червовая отдача из-под туза",
  27: "Вскочить бубновым валетом",
  30: "Пропуск атаки и впустка",
  33: "Маневр Милтона Уорка",
  35: "Перебитки черва-трефа",
  37: "Впустка пиковым валетом",
  38: "Пропуск трефовой десятки",
  40: "Пропуск пикового валета",
  46: "Блеф червовым королём",
  47: "Кроссрафф",
  48: "Перебить бубновым королём",
  49: "Кроссрафф с предосторожностью",
  50: "Снос трефы на черву",
  52: "Снос трефы на бубну",
  53: "Импас трефовой девятки",
  55: "Игра на обратную руку",
  59: "Впустка в трефу",
};

for (const [num, subtitle] of Object.entries(betterTitles)) {
  const id = `cnt_dupont_${String(num).padStart(2, "0")}`;
  const title = `Задача ${num} — ${subtitle}`;
  await sql`UPDATE content_items SET title = ${title} WHERE id = ${id}`;
  console.log(`${id}: ${title}`);
}

console.log(`\nUpdated ${Object.keys(betterTitles).length} titles`);
await sql.end();
