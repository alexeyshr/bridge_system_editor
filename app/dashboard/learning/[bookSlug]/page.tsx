"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeftIcon,
  GraduationCapIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2Icon,
  SearchIcon,
  SpadeIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFaviconToggle } from "@/components/dashboard-favicon-toggle"
import { TopbarGlobalSearch } from "@/components/topbar-global-search"
import { TopbarNotifications } from "@/components/topbar-notifications"
import { TopbarUserMenu } from "@/components/topbar-user-menu"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { trpc } from "@/lib/trpc/react"

export default function LearningBookPage() {
  const { data: session, status } = useSession()
  const params = useParams<{ bookSlug: string }>()
  const bookSlug = params?.bookSlug ?? ""

  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status === "unauthenticated"
  const currentUser = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  const bookQuery = trpc.learningBooks.get.useQuery(
    { slug: bookSlug },
    { enabled: !!bookSlug },
  )
  const book = bookQuery.data?.book ?? null

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Fetch exercises for this book
  const contentQuery = trpc.content.list.useQuery(
    { format: "exercise" as any, limit: 500 },
    { enabled: !!book },
  )
  const items = useMemo(() => {
    if (!book || !contentQuery.data?.items) return []
    return (contentQuery.data.items as Array<{
      id: string
      title: string
      summary: string | null
      coverImageUrl: string | null
      format: string
      tags: string[]
      status: string
      publishedAt: string | null
      createdAt: string
    }>).filter((item) => item.id.startsWith(book.prefix))
      .sort((a, b) => {
        const getOrder = (t: string) => {
          const taskMatch = t.match(/Задача\s+(\d+)/)
          if (taskMatch) return parseInt(taskMatch[1], 10)
          const chMatch = t.match(/Глава\s+(\d+)/)
          const exMatch = t.match(/Пример\s+(\d+)/)
          if (chMatch) return parseInt(chMatch[1], 10) * 100 + (exMatch ? parseInt(exMatch[1], 10) : 0)
          return 9999
        }
        return getOrder(a.title) - getOrder(b.title)
      })
  }, [book, contentQuery.data])

  // Get unique tags for filtering
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    items.forEach((item) => item.tags.forEach((t) => tagSet.add(t)))
    return [...tagSet].sort()
  }, [items])

  // Filter items
  const filtered = useMemo(() => {
    let result = items
    if (selectedTag) result = result.filter((item) => item.tags.includes(selectedTag))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        (item.summary?.toLowerCase().includes(q) ?? false)
      )
    }
    return result
  }, [items, selectedTag, searchQuery])

  const accentColor = book?.accentColor ?? "#2563eb"

  // Loading state
  if (bookQuery.isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar visualVariant="dense" roles={roles} />
        <SidebarInset className="h-svh overflow-hidden bg-[#f6f7fb]">
          <main className="flex flex-1 items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-[#9ca3af]" />
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!book) {
    return (
      <SidebarProvider>
        <AppSidebar visualVariant="dense" roles={roles} />
        <SidebarInset className="h-svh overflow-hidden bg-[#f6f7fb]">
          <main className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-[#1f2734]">Книга не найдена</p>
              <Link href="/dashboard/learning" className="mt-2 text-sm text-[#2563eb] hover:underline">← Назад к каталогу</Link>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar visualVariant="dense" roles={roles} />
      <SidebarInset className="h-svh overflow-hidden bg-[#f6f7fb]">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[#d8dbe1] bg-[#f6f7fb]/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <DashboardFaviconToggle />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 [&[data-slot=separator]]:bg-[#cfd5df]" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard" className="text-[#6e7788]">Portal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/learning" className="text-[#6e7788]">Learning</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[#1f2734]">{book.author}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TopbarGlobalSearch className="hidden sm:flex" />
            {!isGuest ? <TopbarNotifications /> : null}
            <TopbarUserMenu user={currentUser} isGuest={isGuest} />
          </div>
        </header>

        <main className="relative flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-4xl">
            {/* Back + Header */}
            <div className="mb-6">
              <Link href="/dashboard/learning" className="mb-3 inline-flex items-center gap-1 text-sm text-[#6e7788] transition hover:text-[#1f2734]">
                <ArrowLeftIcon className="size-3.5" />
                Все книги
              </Link>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-[#1f2734]">{book.title}</h1>
                  <p className="mt-0.5 text-sm text-[#6e7788]">{book.author} · {items.length} материалов{book.difficulty ? ` · ${book.difficulty}` : ""}</p>
                </div>
                <div className="flex items-center rounded-lg border border-[#d8dbe1] bg-white p-0.5">
                  <button type="button" onClick={() => setViewMode("list")} className={`rounded-md p-1.5 transition ${viewMode === "list" ? "bg-[#f3f4f6] text-[#1f2734]" : "text-[#9ca3af] hover:text-[#6e7788]"}`}><ListIcon className="size-4" /></button>
                  <button type="button" onClick={() => setViewMode("grid")} className={`rounded-md p-1.5 transition ${viewMode === "grid" ? "bg-[#f3f4f6] text-[#1f2734]" : "text-[#9ca3af] hover:text-[#6e7788]"}`}><LayoutGridIcon className="size-4" /></button>
                </div>
              </div>
            </div>

            {/* Search + filters */}
            <div className="mb-6 space-y-3">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white pl-9 pr-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                />
              </div>
              {allTags.length > 1 ? (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${!selectedTag ? "bg-[#1f2734] text-white" : "border border-[#d8dbe1] bg-white text-[#6e7788] hover:bg-[#f3f4f6]"}`}
                  >
                    Все
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${selectedTag === tag ? "bg-[#1f2734] text-white" : "border border-[#d8dbe1] bg-white text-[#6e7788] hover:bg-[#f3f4f6]"}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Content */}
            {contentQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2Icon className="size-6 animate-spin text-[#9ca3af]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d8dbe1] bg-white p-10 text-center">
                <GraduationCapIcon className="mx-auto size-10 text-[#d1d5db]" />
                <p className="mt-3 text-sm text-[#6e7788]">Материалы не найдены</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/content/${item.id}`}
                    className="group flex flex-col rounded-lg border border-[#e5e7eb] bg-white p-3.5 transition hover:border-[#6b7280] hover:shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${accentColor}15` }}>
                        <SpadeIcon className="size-3.5" style={{ color: accentColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1f2734] group-hover:text-[#2563eb] line-clamp-2">{item.title}</p>
                        {item.summary ? <p className="mt-1 text-xs text-[#6e7788] line-clamp-2">{item.summary}</p> : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[#e5e7eb] rounded-lg border border-[#e5e7eb] bg-white">
                {filtered.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/content/${item.id}`}
                    className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-[#f9fafb]"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${accentColor}15` }}>
                      <SpadeIcon className="size-3.5" style={{ color: accentColor }} />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-[#1f2734] group-hover:text-[#2563eb]">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
