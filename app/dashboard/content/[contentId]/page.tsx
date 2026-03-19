"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ChevronLeftIcon, ChevronRightIcon, NotebookPenIcon, PencilLineIcon } from "lucide-react"

import { ContentBlockRenderer } from "@/components/content-block-renderer"
import { ContentComments } from "@/components/content-comments"
import { PortalPageShell } from "@/components/portal-page-shell"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import { trpc } from "@/lib/trpc/react"
import type { ContentBlock } from "@/lib/validation/content"

type ContentItem = {
  id: string
  title: string
  summary: string | null
  coverImageUrl: string | null
  format: string
  visibility: string
  status: string
  blocks: ContentBlock[]
  tags: string[]
  links: Array<{ id: string; targetType: string; targetId: string | null; url: string | null; label: string | null }>
  authorUserId: string
  authorDisplayName: string | null
  publishedAt: string | null
  createdAt: string
}

export default function ContentViewPage() {
  const { data: session, status } = useSession()
  const params = useParams<{ contentId: string }>()
  const contentId = useMemo(() => params?.contentId ?? "", [params?.contentId])
  const query = trpc.content.get.useQuery({ contentId }, { enabled: Boolean(contentId) })

  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status !== "authenticated"
  const user = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }
  const item = (query.data?.item ?? null) as ContentItem | null

  // For exercise items, determine book slug from ID prefix
  const isExercise = item?.format === "exercise"
  const bookSlug = useMemo(() => {
    if (!isExercise) return null
    if (contentId.startsWith("cnt_dupont")) return "dupont"
    if (contentId.startsWith("cnt_lawrence")) return "lawrence"
    // Generic: extract prefix between "cnt_" and next "_"
    const m = contentId.match(/^cnt_([a-z]+)/)
    return m ? m[1] : null
  }, [isExercise, contentId])
  const booksQuery = trpc.learningBooks?.list?.useQuery(undefined, { enabled: isExercise })
  const bookTitle = useMemo(() => {
    if (!bookSlug || !booksQuery?.data) return null
    const books = (booksQuery.data as { books: Array<{ slug: string; title: string; author: string }> }).books ?? []
    const book = books.find(b => b.slug === bookSlug)
    return book ? book.author : null
  }, [bookSlug, booksQuery?.data])
  const siblingsQuery = trpc.content.list.useQuery(
    { format: "exercise" as any, limit: 500 },
    { enabled: isExercise }
  )
  const { prev, next } = useMemo(() => {
    if (!isExercise || !siblingsQuery.data?.items) return { prev: null, next: null }
    // Only navigate within same book — match ID prefix (cnt_dupont, cnt_lawrence, etc.)
    const prefix = contentId.replace(/(_task)?_\d+.*$/, "").replace(/_ch\d+.*$/, "")
    // Extract numeric order from title (e.g. "Задача 4 — ..." → 4, "Глава 1. Пример 2" → 1.02)
    const getOrder = (item: { id: string; title: string }) => {
      const taskMatch = item.title.match(/Задача\s+(\d+)/)
      if (taskMatch) return parseInt(taskMatch[1], 10)
      const chMatch = item.title.match(/Глава\s+(\d+)/)
      const exMatch = item.title.match(/Пример\s+(\d+)/)
      if (chMatch) return parseInt(chMatch[1], 10) * 100 + (exMatch ? parseInt(exMatch[1], 10) : 0)
      return 9999
    }
    const siblings = [...(siblingsQuery.data.items as Array<{ id: string; title: string; createdAt: string }>)]
      .filter((s) => s.id.startsWith(prefix))
      .sort((a, b) => getOrder(a) - getOrder(b))
    const idx = siblings.findIndex((s) => s.id === contentId)
    return {
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
    }
  }, [isExercise, siblingsQuery.data, contentId])

  return (
    <PortalPageShell
      roles={roles}
      isGuest={isGuest}
      user={user}
      breadcrumbs={isExercise && bookSlug ? [
        { label: "Portal", href: "/dashboard" },
        { label: "Learning", href: "/dashboard/learning" },
        { label: bookTitle ?? bookSlug, href: `/dashboard/learning/${bookSlug}` },
        { label: item?.title ?? "View" },
      ] : [
        { label: "Portal", href: "/dashboard" },
        { label: "Content", href: "/dashboard/content" },
        { label: item?.title ?? "View" },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        {query.isLoading ? (
          <section className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
            <p className="text-sm text-[#6e7788]">Loading content...</p>
          </section>
        ) : null}

        {query.error ? (
          <section className="rounded-xl border border-[#e5cad0] bg-[#fff2f4] p-4 text-sm text-[#8b3240]">
            Failed to load content: {query.error.message}
          </section>
        ) : null}

        {item ? (
          <article className="mx-auto max-w-4xl">
            {/* Back to book link for exercises */}
            {isExercise && bookSlug ? (
              <Link href={`/dashboard/learning/${bookSlug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-[#6e7788] hover:text-[#2563eb] transition">
                <ChevronLeftIcon className="size-4" />
                <span>← Все материалы книги</span>
              </Link>
            ) : null}
            {/* Cover image */}
            {item.coverImageUrl ? (
              <div className="mb-6 overflow-hidden rounded-xl">
                <img src={item.coverImageUrl} alt="" className="h-56 w-full object-cover" />
              </div>
            ) : null}

            {/* Magazine header */}
            <header className="mb-8 border-b border-[#e5e7eb] pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold tracking-tight text-[#1f2734] leading-tight">{item.title}</h1>
                  {item.summary ? <p className="mt-3 text-[15px] leading-relaxed text-[#5f6a7b]">{item.summary}</p> : null}
                </div>
                {!isGuest ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {item.format === "deal_analysis" ? (
                      <Link
                        href={`/dashboard/content/${encodeURIComponent(item.id)}/study`}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d1d5db] px-2.5 text-xs font-medium text-[#374151] transition hover:bg-[#f3f4f6]"
                      >
                        <NotebookPenIcon className="size-3.5" />
                        Study
                      </Link>
                    ) : null}
                    <Link
                      href={`/dashboard/content/${encodeURIComponent(item.id)}/edit`}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d1d5db] px-2.5 text-xs font-medium text-[#374151] transition hover:bg-[#f3f4f6]"
                    >
                      <PencilLineIcon className="size-3.5" />
                      Edit
                    </Link>
                  </div>
                ) : null}
              </div>
              {/* Author & date */}
              <div className="mt-3 flex items-center gap-2 text-sm text-[#6e7788]">
                {item.authorDisplayName ? (
                  <span className="font-medium text-[#1f2734]">{item.authorDisplayName}</span>
                ) : null}
                {item.publishedAt || item.createdAt ? (
                  <>
                    {item.authorDisplayName ? <span className="text-[#d1d5db]">·</span> : null}
                    <time dateTime={item.publishedAt ?? item.createdAt}>
                      {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </time>
                  </>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-[#9ca3af]">
                <span>{item.format.replaceAll("_", " ")}</span>
                <span className="text-[#d1d5db]">/</span>
                <span>{item.visibility === "members_only" ? "members" : "public"}</span>
                <span className="text-[#d1d5db]">/</span>
                <span>{item.status}</span>
                {item.tags.length > 0 ? (
                  <>
                    <span className="text-[#d1d5db]">/</span>
                    {item.tags.map((tag) => (
                      <span key={tag} className="text-[#6b7280]">#{tag}</span>
                    ))}
                  </>
                ) : null}
              </div>
            </header>

            {/* Article body — flowing prose with deal+auction grouping */}
            <div className="space-y-0">
              {(() => {
                const elements: React.ReactNode[] = []
                const blocks = item.blocks
                let i = 0
                while (i < blocks.length) {
                  const block = blocks[i]
                  // Group: deal followed by auction (and optional text for notes)
                  if (block.type === "deal" && i + 1 < blocks.length && blocks[i + 1].type === "auction") {
                    const dealBlock = block
                    const auctionBlock = blocks[i + 1]
                    // Check if there's a text block right after auction (commentary)
                    const hasFollowingText = i + 2 < blocks.length && blocks[i + 2].type === "text"
                    elements.push(
                      <div key={`group-${i}`} className="my-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                        <div className="shrink-0 lg:w-[54%]">
                          <ContentBlockRenderer block={dealBlock} index={i} />
                        </div>
                        <div className="min-w-0 flex-1 lg:pt-2">
                          <ContentBlockRenderer block={auctionBlock} index={i + 1} />
                          {hasFollowingText ? (
                            <div className="mt-3">
                              <ContentBlockRenderer block={blocks[i + 2]} index={i + 2} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                    i += hasFollowingText ? 3 : 2
                  } else {
                    elements.push(
                      <ContentBlockRenderer key={`${block.type}-${i}`} block={block} index={i} />
                    )
                    i++
                  }
                }
                return elements
              })()}
            </div>

            {/* Prev/Next navigation for exercises */}
            {isExercise && (prev || next) ? (
              <nav className="mt-8 flex items-stretch gap-3 border-t border-[#e5e7eb] pt-6">
                {prev ? (
                  <Link
                    href={`/dashboard/content/${prev.id}`}
                    className="group flex flex-1 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white p-3 transition hover:border-[#6b7280] hover:shadow-sm"
                  >
                    <ChevronLeftIcon className="size-4 shrink-0 text-[#9ca3af] group-hover:text-[#1f2734]" />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-[#9ca3af]">Предыдущая</div>
                      <div className="truncate text-sm font-medium text-[#1f2734] group-hover:text-[#2563eb]">{prev.title}</div>
                    </div>
                  </Link>
                ) : <div className="flex-1" />}
                {next ? (
                  <Link
                    href={`/dashboard/content/${next.id}`}
                    className="group flex flex-1 items-center justify-end gap-2 rounded-lg border border-[#e5e7eb] bg-white p-3 text-right transition hover:border-[#6b7280] hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-[#9ca3af]">Следующая</div>
                      <div className="truncate text-sm font-medium text-[#1f2734] group-hover:text-[#2563eb]">{next.title}</div>
                    </div>
                    <ChevronRightIcon className="size-4 shrink-0 text-[#9ca3af] group-hover:text-[#1f2734]" />
                  </Link>
                ) : <div className="flex-1" />}
              </nav>
            ) : null}

            {/* Comments */}
            <ContentComments contentId={item.id} />
          </article>
        ) : null}
      </div>
    </PortalPageShell>
  )
}
