"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FilterIcon,
  GlobeIcon,
  Loader2Icon,
  ShieldIcon,
  SwordsIcon,
  SpadeIcon,
  GraduationCapIcon,
  PuzzleIcon,
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

type Resource = {
  id: string
  title: string
  url: string
  source: string
  category: string
  subcategory: string | null
  description: string | null
  author: string | null
  language: string
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  bidding: { label: "Торговля", icon: <SpadeIcon className="size-4" />, color: "text-[#2b3446] bg-[#f0f2f5]" },
  conventions: { label: "Конвенции", icon: <PuzzleIcon className="size-4" />, color: "text-[#7c3aed] bg-[#f5f3ff]" },
  play: { label: "Розыгрыш", icon: <SwordsIcon className="size-4" />, color: "text-[#b7692f] bg-[#fef7ed]" },
  defense: { label: "Защита", icon: <ShieldIcon className="size-4" />, color: "text-[#9e2d36] bg-[#fef2f2]" },
  books: { label: "Книги", icon: <BookOpenIcon className="size-4" />, color: "text-[#2f6a4a] bg-[#f0fdf4]" },
  learning: { label: "Обучение", icon: <GraduationCapIcon className="size-4" />, color: "text-[#2563eb] bg-[#eff6ff]" },
}

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { label: cat, icon: <GlobeIcon className="size-4" />, color: "text-[#6b7280] bg-[#f3f4f6]" }
}

export default function DashboardLibraryPage() {
  const { data: session, status } = useSession()
  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status === "unauthenticated"
  const currentUser = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const url = selectedCategory
      ? `/api/library?category=${encodeURIComponent(selectedCategory)}`
      : "/api/library"
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setResources(data.resources ?? [])
          if (data.categories) setCategories(data.categories)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedCategory])

  // Group resources by category
  const grouped = new Map<string, Resource[]>()
  for (const r of resources) {
    const arr = grouped.get(r.category) ?? []
    arr.push(r)
    grouped.set(r.category, arr)
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
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[#1f2734]">Library</BreadcrumbPage>
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
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#1f2734]">📚 Библиотека</h1>
              <p className="mt-1 text-sm text-[#6e7788]">Полезные материалы, книги и статьи о бридже</p>
            </div>

            {/* Category filters */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  !selectedCategory
                    ? "bg-[#1f2734] text-white"
                    : "border border-[#d8dbe1] bg-white text-[#6e7788] hover:bg-[#f3f4f6]"
                }`}
              >
                <FilterIcon className="size-3" />
                Все
              </button>
              {categories.map((cat) => {
                const meta = getCategoryMeta(cat)
                const active = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(active ? null : cat)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "bg-[#1f2734] text-white"
                        : `border border-[#d8dbe1] bg-white text-[#6e7788] hover:bg-[#f3f4f6]`
                    }`}
                  >
                    {meta.icon}
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {/* Resources */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2Icon className="size-6 animate-spin text-[#9ca3af]" />
              </div>
            ) : resources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d8dbe1] bg-white p-10 text-center">
                <BookOpenIcon className="mx-auto size-10 text-[#d1d5db]" />
                <p className="mt-3 text-sm text-[#6e7788]">Ресурсы не найдены</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[...grouped.entries()].map(([cat, items]) => {
                  const meta = getCategoryMeta(cat)
                  return (
                    <section key={cat}>
                      <div className="mb-3 flex items-center gap-2">
                        <div className={`flex size-7 items-center justify-center rounded-lg ${meta.color}`}>
                          {meta.icon}
                        </div>
                        <h2 className="text-sm font-semibold text-[#1f2734]">{meta.label}</h2>
                        <span className="text-[11px] text-[#9ca3af]">{items.length}</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((r) => (
                          <a
                            key={r.id}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-3 rounded-lg border border-[#e5e7eb] bg-white p-3 transition hover:border-[#6b7280] hover:shadow-sm"
                          >
                            <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${meta.color}`}>
                              {meta.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              {r.author ? (
                                <p className="text-[13px] font-semibold text-[#1f2734]">{r.author}</p>
                              ) : null}
                              <p className="text-sm font-medium text-[#1f2734] group-hover:text-blue-600">
                                {r.title}
                                <ExternalLinkIcon className="ml-1 inline size-3 text-[#9ca3af] opacity-0 transition group-hover:opacity-100" />
                              </p>
                              {r.description ? (
                                <p className="mt-0.5 text-xs text-[#6e7788] line-clamp-2">{r.description}</p>
                              ) : null}
                              {r.language !== "ru" ? (
                                <div className="mt-1 text-[10px] text-[#9ca3af]">
                                  <span className="rounded border border-[#e5e7eb] px-1 py-px uppercase">{r.language}</span>
                                </div>
                              ) : null}
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
