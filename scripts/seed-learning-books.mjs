/**
 * Seed script: insert the two existing learning books into the learning_books table.
 *
 * Usage:
 *   node scripts/seed-learning-books.mjs
 *
 * Requires DATABASE_URL env var or uses the default.
 * This is idempotent — uses ON CONFLICT DO NOTHING.
 */

import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://bridge:e9e60d55087a295c2f97fc44787df64a@185.196.41.85:5433/bridge_editor';

const sql = postgres(DATABASE_URL, { prepare: false });

const books = [
  {
    id: 'dupont',
    slug: 'dupont',
    prefix: 'cnt_dupont',
    title: 'Искусство и магия бриджа',
    author: 'Ги Дюпон',
    description:
      '60 задач на розыгрыш с нарастающей сложностью. Безопасный розыгрыш, элиминация, эндплей, сквиз, кроссрафф.',
    difficulty: '★–★★★',
    accent_color: '#2563eb',
    icon: 'spade',
    sort_order: 0,
  },
  {
    id: 'lawrence',
    slug: 'lawrence',
    prefix: 'cnt_lawrence',
    title: 'Как распознать карты противника',
    author: 'Майк Лоуренс',
    description:
      'Анализ торговли, первого хода и розыгрыша для определения расклада у противников. 7 глав с примерами и упражнениями.',
    difficulty: '★–★★★',
    accent_color: '#9333ea',
    icon: 'diamond',
    sort_order: 1,
  },
];

async function main() {
  for (const book of books) {
    await sql`
      INSERT INTO learning_books (id, slug, prefix, title, author, description, difficulty, accent_color, icon, sort_order)
      VALUES (${book.id}, ${book.slug}, ${book.prefix}, ${book.title}, ${book.author}, ${book.description}, ${book.difficulty}, ${book.accent_color}, ${book.icon}, ${book.sort_order})
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`Seeded book: ${book.id}`);
  }
  console.log('Done.');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
