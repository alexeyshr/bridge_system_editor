/**
 * Learning books configuration.
 *
 * This module now serves as a thin compatibility layer.
 * The canonical source of truth is the `learning_books` DB table,
 * accessed via tRPC (`learningBooks.list` / `learningBooks.get`).
 *
 * The static fallback below is kept only for any legacy server-side
 * callers that haven't migrated to tRPC yet.
 */

export interface LearningBook {
  slug: string
  prefix: string
  title: string
  author: string
  description: string
  difficulty: string
  accentColor: string
  icon: "spade" | "heart" | "diamond" | "club"
  coverUrl?: string
}

/** @deprecated Use tRPC `learningBooks.list` instead */
export const LEARNING_BOOKS: LearningBook[] = [
  {
    slug: "dupont",
    prefix: "cnt_dupont",
    title: "Искусство и магия бриджа",
    author: "Ги Дюпон",
    description: "60 задач на розыгрыш с нарастающей сложностью. Безопасный розыгрыш, элиминация, эндплей, сквиз, кроссрафф.",
    difficulty: "★–★★★",
    accentColor: "#2563eb",
    icon: "spade",
  },
  {
    slug: "lawrence",
    prefix: "cnt_lawrence",
    title: "Как распознать карты противника",
    author: "Майк Лоуренс",
    description: "Анализ торговли, первого хода и розыгрыша для определения расклада у противников. 7 глав с примерами и упражнениями.",
    difficulty: "★–★★★",
    accentColor: "#9333ea",
    icon: "diamond",
  },
]

/** @deprecated Use tRPC `learningBooks.get` instead */
export function getBookBySlug(slug: string): LearningBook | undefined {
  return LEARNING_BOOKS.find((b) => b.slug === slug)
}
