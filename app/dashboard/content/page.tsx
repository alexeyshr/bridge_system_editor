"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { FilePlus2Icon, FilterIcon, SearchIcon } from "lucide-react"

import { PortalPageShell } from "@/components/portal-page-shell"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import { trpc } from "@/lib/trpc/react"

type StatusFilter = "all" | "draft" | "published" | "archived"
type FormatFilter = "all" | "article" | "deal_analysis" | "auction_lesson" | "tournament_recap" | "quiz"

export default function ContentListPage() {
  const { data: session, status } = useSession()
  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status !== "authenticated"
  const user = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all")
  const [spaceFilter, setSpaceFilter] = useState("all")

  const spacesQuery = trpc.spaces.list.useQuery(undefined, { staleTime: 15_000 })
  const listInput = useMemo(() => ({
    query: query.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    format: formatFilter === "all" ? undefined : formatFilter,
    spaceId: spaceFilter === "all" ? undefined : spaceFilter,
    limit: 80,
  }), [formatFilter, query, spaceFilter, statusFilter])
  const contentQuery = trpc.content.list.useQuery(listInput, { staleTime: 5_000 })

  return (
    <PortalPageShell
      roles={roles}
      isGuest={isGuest}
      user={user}
      breadcrumbs={[
        { label: "Portal", href: "/dashboard" },
        { label: "Content" },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#1f2734]">Content workspace</h1>
              <p className="mt-1 text-sm text-[#6e7788]">Drafts, published materials, and archived entries in one place.</p>
            </div>
            {!isGuest ? (
              <Link
                href="/dashboard/content/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-3 text-sm font-medium text-[#2f466d] transition hover:bg-[#e2ebfa]"
              >
                <FilePlus2Icon className="size-4" />
                New draft
              </Link>
            ) : (
              <a href="/auth/signin?callbackUrl=/dashboard/content/new" className="text-sm font-medium text-[#2f466d] hover:underline">
                Sign in to create
              </a>
            )}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#6e7788]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search content title..."
                className="h-10 w-full rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] pl-8 pr-3 text-sm text-[#1f2734]"
              />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-10 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm text-[#1f2734]">
              <option value="all">Status: all</option>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
            <select value={formatFilter} onChange={(event) => setFormatFilter(event.target.value as FormatFilter)} className="h-10 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm text-[#1f2734]">
              <option value="all">Format: all</option>
              <option value="article">article</option>
              <option value="deal_analysis">deal analysis</option>
              <option value="auction_lesson">auction lesson</option>
              <option value="tournament_recap">tournament recap</option>
              <option value="quiz">quiz</option>
            </select>
            <select value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)} className="h-10 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm text-[#1f2734]">
              <option value="all">Space: all</option>
              {(spacesQuery.data?.spaces ?? []).map((space) => (
                <option key={space.id} value={space.id}>{space.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 py-1 text-xs text-[#5f6a7b]">
            <FilterIcon className="size-3.5" />
            {contentQuery.data?.items.length ?? 0} items
          </div>
        </section>

        {contentQuery.error ? (
          <section className="rounded-xl border border-[#e5cad0] bg-[#fff2f4] p-4 text-sm text-[#8b3240]">
            Failed to load content list: {contentQuery.error.message}
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(contentQuery.data?.items ?? []).map((item) => (
            <article key={item.id} className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold leading-tight text-[#1f2734]">{item.title}</h2>
                <span className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-[11px] text-[#5f6a7b]">
                  {item.status}
                </span>
              </div>
              {item.summary ? <p className="mt-1 text-sm text-[#5f6a7b]">{item.summary}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]">{item.format.replaceAll("_", " ")}</span>
                <span className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]">{item.visibility}</span>
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]">#{tag}</span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Link href={`/dashboard/content/${encodeURIComponent(item.id)}`} className="text-[#2f466d] hover:underline">
                  Open
                </Link>
                {item.format === "deal_analysis" ? (
                  <Link href={`/dashboard/content/${encodeURIComponent(item.id)}/study`} className="text-[#2f466d] hover:underline">
                    Studio
                  </Link>
                ) : null}
                {!isGuest ? (
                  <Link href={`/dashboard/content/${encodeURIComponent(item.id)}/edit`} className="text-[#2f466d] hover:underline">
                    Edit
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        {(contentQuery.data?.items.length ?? 0) === 0 && !contentQuery.isLoading ? (
          <section className="rounded-xl border border-dashed border-[#cfd5df] bg-white/70 p-8 text-center">
            <p className="text-base font-medium text-[#1f2734]">No content found</p>
            <p className="mt-1 text-sm text-[#6e7788]">Try changing filters or create a new draft.</p>
          </section>
        ) : null}
      </div>
    </PortalPageShell>
  )
}
