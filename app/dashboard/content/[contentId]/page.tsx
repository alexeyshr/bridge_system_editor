"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { FileTextIcon, NotebookPenIcon, PencilLineIcon } from "lucide-react"

import { ContentBlockRenderer } from "@/components/content-block-renderer"
import { PortalPageShell } from "@/components/portal-page-shell"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import { trpc } from "@/lib/trpc/react"
import type { ContentBlock } from "@/lib/validation/content"

type ContentItem = {
  id: string
  title: string
  summary: string | null
  format: string
  visibility: string
  status: string
  blocks: ContentBlock[]
  tags: string[]
  links: Array<{ id: string; targetType: string; targetId: string | null; url: string | null; label: string | null }>
  authorUserId: string
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

  return (
    <PortalPageShell
      roles={roles}
      isGuest={isGuest}
      user={user}
      breadcrumbs={[
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
          <>
            <section className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-2">
                    <FileTextIcon className="size-5 text-[#4f5e78]" />
                    <h1 className="text-2xl font-semibold text-[#1f2734]">{item.title}</h1>
                  </div>
                  {item.summary ? <p className="mt-2 text-sm text-[#5f6a7b]">{item.summary}</p> : null}
                </div>
                {!isGuest ? (
                  <div className="flex items-center gap-2">
                    {item.format === "deal_analysis" ? (
                      <Link
                        href={`/dashboard/content/${encodeURIComponent(item.id)}/study`}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#cfd5df] bg-[#f5f7fb] px-3 text-sm font-medium text-[#2f466d] transition hover:bg-[#ebeff8]"
                      >
                        <NotebookPenIcon className="size-4" />
                        Study
                      </Link>
                    ) : null}
                    <Link
                      href={`/dashboard/content/${encodeURIComponent(item.id)}/edit`}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-3 text-sm font-medium text-[#2f466d] transition hover:bg-[#e2ebfa]"
                    >
                      <PencilLineIcon className="size-4" />
                      Edit
                    </Link>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]">
                  {item.format.replaceAll("_", " ")}
                </span>
                <span className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]">
                  {item.visibility}
                </span>
                <span className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]">
                  {item.status}
                </span>
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]">
                    #{tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              {item.blocks.map((block, index) => (
                <ContentBlockRenderer key={`${block.type}-${index}`} block={block} index={index} />
              ))}
            </section>
          </>
        ) : null}
      </div>
    </PortalPageShell>
  )
}
