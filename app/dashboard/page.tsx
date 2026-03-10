import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFaviconToggle } from "@/components/dashboard-favicon-toggle"
import { FeedSortControl } from "@/components/feed-sort-control"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

const stats = [
  { label: "Active tournaments", value: "12", delta: "+2 this week" },
  { label: "New requests", value: "47", delta: "+9 today" },
  { label: "Teams online", value: "23", delta: "Peak: 31" },
  { label: "Open tasks", value: "18", delta: "6 high priority" },
]

const feed = [
  {
    title: "Spring Cup regulation updated",
    time: "10 minutes ago",
    text: "Timing details and tie-break format were clarified.",
  },
  {
    title: "New player database imported",
    time: "42 minutes ago",
    text: "132 participant records were synchronized from CRM.",
  },
  {
    title: "Registration for stage 3 is open",
    time: "Today, 09:15",
    text: "Registration window is open until March 14, 2026.",
  },
]

const quickActions = [
  "Create tournament",
  "Open match calendar",
  "Generate requests report",
  "Invite organizer",
]

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar visualVariant="dense" />
      <SidebarInset className="h-svh overflow-hidden bg-[#f6f7fb]">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[#d8dbe1] bg-[#f6f7fb]/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <DashboardFaviconToggle />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto [&[data-slot=separator]]:bg-[#cfd5df]"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard" className="text-[#6e7788]">
                    Portal
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[#1f2734]">Frontpage</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <FeedSortControl />
            <button
              type="button"
              className="hidden rounded-xl border border-[#cfd5df] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#1f2734] shadow-sm transition-colors hover:bg-[#edf2fa] md:inline-flex"
            >
              Create post
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl space-y-3 p-3 md:p-4">
            <section className="rounded-xl border border-[#d8dbe1] bg-white p-4 shadow-sm">
              <h1 className="text-lg font-semibold tracking-tight text-[#1f2734]">
                Welcome to the portal workspace
              </h1>
              <p className="mt-2 text-sm text-[#6e7788]">
                Track live operations, access quick actions, and review the latest
                project updates from one place.
              </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <article
                  key={item.label}
                  className="rounded-xl border border-[#d8dbe1] bg-white p-3 shadow-sm"
                >
                  <p className="text-xs text-[#6e7788]">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-[#1f2734]">{item.value}</p>
                  <p className="mt-1 text-xs text-[#6e7788]">{item.delta}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <article className="rounded-xl border border-[#d8dbe1] bg-white p-4 shadow-sm xl:col-span-2">
                <h2 className="text-base font-semibold text-[#1f2734]">
                  Activity feed
                </h2>
                <div className="mt-4 space-y-3">
                  {feed.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#1f2734]">{item.title}</p>
                        <span className="text-xs text-[#6e7788]">{item.time}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#6e7788]">{item.text}</p>
                    </div>
                  ))}
                </div>
              </article>

              <aside className="rounded-xl border border-[#d8dbe1] bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-[#1f2734]">
                  Quick actions
                </h2>
                <div className="mt-4 space-y-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-3 py-2 text-left text-sm text-[#1f2734] transition-colors hover:bg-[#eef2f7]"
                    >
                      <span>{action}</span>
                      <span className="text-[#6e7788]">-&gt;</span>
                    </button>
                  ))}
                </div>
              </aside>
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
