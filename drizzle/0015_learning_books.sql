CREATE TABLE IF NOT EXISTS "learning_books" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "prefix" text NOT NULL,
  "title" text NOT NULL,
  "author" text NOT NULL,
  "description" text,
  "difficulty" text,
  "accent_color" text DEFAULT '#2563eb',
  "icon" text DEFAULT 'spade',
  "cover_url" text,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learning_books_slug_unique" ON "learning_books" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_books_sort_order_idx" ON "learning_books" USING btree ("sort_order");
--> statement-breakpoint
INSERT INTO "learning_books" ("id", "slug", "prefix", "title", "author", "description", "difficulty", "accent_color", "icon", "sort_order")
VALUES
  ('dupont', 'dupont', 'cnt_dupont', 'Искусство и магия бриджа', 'Ги Дюпон', '60 задач на розыгрыш с нарастающей сложностью. Безопасный розыгрыш, элиминация, эндплей, сквиз, кроссрафф.', '★–★★★', '#2563eb', 'spade', 0),
  ('lawrence', 'lawrence', 'cnt_lawrence', 'Как распознать карты противника', 'Майк Лоуренс', 'Анализ торговли, первого хода и розыгрыша для определения расклада у противников. 7 глав с примерами и упражнениями.', '★–★★★', '#9333ea', 'diamond', 1);
