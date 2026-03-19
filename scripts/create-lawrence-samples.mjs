import postgres from "postgres";
const sql = postgres("postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor");

const spaceId = "space_eeb2a304a4714662891020a2ba4406db";
const authorId = (await sql`SELECT id FROM users LIMIT 1`)[0].id;

const articles = [
  {
    id: "cnt_lawrence_ch1_intro",
    title: "Глава 1. Рассмотрение дела — Введение",
    summary: "★ Начальный уровень · Как распознать карты противника · Майк Лоуренс",
    blocks: [
      {
        type: "text",
        markdown: "Из книги **Майк Лоуренс** — *Как распознать карты противника*.\n\nЭта книга рассматривает ход мышления хорошего игрока в ситуациях, где определение расклада возможно путём анализа торговли, первого хода и розыгрыша. Главный принцип:\n\n> **Всегда обращайте внимание на полученную информацию.**\n\nСледите за торговлей, за первым ходом, за тем, кто какими картами сыграл. Попытайтесь, чтобы это вошло у вас в привычку."
      },
      {
        type: "text",
        markdown: "### Стандартные первые ходы\n\n- **Королём** — из комбинации ТК или КД\n- **Тузом** — из дублета ТК или при ходе в масть партнера\n- **Дамой** — из секвенции ДВ, или если она синглетная/вторая\n\nБольшинство противников используют стандартные ходы, поскольку вистующим важнее передать информацию друг другу, чем дезинформировать разыгрывающего."
      }
    ]
  },
  {
    id: "cnt_lawrence_ch1_ex1",
    title: "Глава 1. Пример 1 — Контракт 4♠",
    summary: "★ Начальный уровень · Как распознать карты противника · Майк Лоуренс",
    blocks: [
      {
        type: "text",
        markdown: "Из книги **Майк Лоуренс** — *Как распознать карты противника*. Глава 1.\n\nКонтракт 4♠. Как разыгрывать в зависимости от информации?"
      },
      {
        type: "deal",
        dealer: "S",
        vulnerability: "none",
        hands: {
          north: { spades: "KQ93", hearts: "863", diamonds: "A76", clubs: "Q52" },
          south: { spades: "862", hearts: "AKQJT4", diamonds: "KT", clubs: "84" },
          west: { spades: "", hearts: "", diamonds: "", clubs: "" },
          east: { spades: "", hearts: "", diamonds: "", clubs: "" }
        }
      },
      {
        type: "text",
        markdown: "### Ситуация 1\nПротивники не вступали в торговлю. Запад атаковал козырной ♥9.\n\n**Решение:** В отсутствие информации — дважды сыграть ♠ с руки, в надежде на ♠T у Запада."
      },
      {
        type: "text",
        markdown: "### Ситуация 2\nВосток открыл торговлю заявкой 1♣. Запад атаковал ♣T и продолжил ♣3. Вы убили третью трефу козырем.\n\n**Решение:** Если после открытия Востока вы уверены, что у него есть ♠T, то на первом же круге розыгрыша пик нужно импасировать к ♠9."
      },
      {
        type: "text",
        markdown: "### Ситуация 3\nПротивники не вступали в торговлю. Запад атаковал ♠В и вы получили взятку на ♠K стола.\n\n**Решение:** Первый ход ♠В указывает на ♠T у Запада. Лучший план — сыграть пикой к ♠Q на столе."
      },
      {
        type: "question",
        question: "Почему в каждой ситуации план розыгрыша меняется?"
      },
      {
        type: "answer",
        text: "Потому что каждая новая порция информации (торговля противника, первый ход, карты на столе) **меняет вероятности расклада**. Хороший игрок адаптирует свой план на основе этих данных, а не играет шаблонно."
      }
    ]
  },
  {
    id: "cnt_lawrence_ch1_ex2",
    title: "Глава 1. Пример 2 — Контракт 4♥",
    summary: "★ Начальный уровень · Как распознать карты противника · Майк Лоуренс",
    blocks: [
      {
        type: "text",
        markdown: "Из книги **Майк Лоуренс** — *Как распознать карты противника*. Глава 1.\n\nВновь контракт 4♥. Партнёр забыл остановиться в 3БК."
      },
      {
        type: "deal",
        dealer: "S",
        vulnerability: "none",
        hands: {
          north: { spades: "K742", hearts: "AQ4", diamonds: "K32", clubs: "A32" },
          south: { spades: "63", hearts: "KJT65", diamonds: "A65", clubs: "K64" },
          west: { spades: "", hearts: "", diamonds: "", clubs: "" },
          east: { spades: "", hearts: "", diamonds: "", clubs: "" }
        }
      },
      {
        type: "text",
        markdown: "### Ситуация 1\nОппоненты не вступали в торговлю. Запад атаковал ♣Q.\n\n**Решение:** Без информации о расположении ♠A — играйте ♠ с руки к ♠K. Выигрыш при ♠A у Запада."
      },
      {
        type: "text",
        markdown: "### Ситуация 2\nОппоненты не вступали в торговлю. Запад атаковал ♠Q.\n\n**Решение:** Первый ход ♠Q говорит, что ♠A у Востока. Значит, план с импасом пик обречён. Надо играть на выпадение ♠A на первых кругах."
      },
      {
        type: "text",
        markdown: "### Ситуация 3\nВосток открыл торговлю заявкой 1♣. Запад атаковал ♣10.\n\n**Решение:** Открытие Востока помещает у него большинство фигур. Вероятно, ♠A у Востока. Как и в ситуации 2, играйте на выпадение."
      },
      {
        type: "question",
        question: "Какой ключевой принцип объединяет все три ситуации?"
      },
      {
        type: "answer",
        text: "**Информация определяет план.** Один и тот же расклад разыгрывается по-разному в зависимости от того, что вы узнали из торговли и первого хода. Не играйте шаблонно — анализируйте каждую подсказку."
      }
    ]
  }
];

for (const article of articles) {
  await sql`INSERT INTO content_items (id, space_id, author_user_id, title, summary, format, visibility, status, blocks, updated_by_id)
    VALUES (${article.id}, ${spaceId}, ${authorId}, ${article.title}, ${article.summary}, 'exercise', 'public', 'published', ${sql.json(article.blocks)}, ${authorId})
    ON CONFLICT (id) DO UPDATE SET title = ${article.title}, summary = ${article.summary}, blocks = ${sql.json(article.blocks)}`;

  // Add tags
  await sql`INSERT INTO content_tags (id, content_item_id, tag) VALUES (${`tag_${article.id}_analysis`}, ${article.id}, ${"анализ"})
    ON CONFLICT (id) DO NOTHING`;

  console.log(`Created: ${article.title}`);
}

console.log("\nDone! 3 sample articles created.");
await sql.end();
