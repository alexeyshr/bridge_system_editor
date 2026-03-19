"use client"

import { useSession } from "next-auth/react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFaviconToggle } from "@/components/dashboard-favicon-toggle"
import { DashboardSummaryWidget } from "@/components/dashboard-summary-widget"
import { TopbarGuestWelcome } from "@/components/topbar-guest-welcome"
import { TopbarGlobalSearch } from "@/components/topbar-global-search"
import { TopbarNotifications } from "@/components/topbar-notifications"
import { TopbarSuitIcons } from "@/components/topbar-suit-icons"
import { TopbarUserMenu } from "@/components/topbar-user-menu"
import {
  normalizePortalRoles,
  type PortalRole,
} from "@/lib/portal-access"
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
  useSidebar,
} from "@/components/ui/sidebar"

function DashboardContent({ isGuest, currentUser }: { isGuest: boolean; currentUser: { name: string; email: string | null; image: string | null } }) {
  const { state: sidebarState } = useSidebar()

  return (
    <SidebarInset className="h-svh overflow-hidden bg-white">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[#e5e7eb] bg-white/95 px-4 backdrop-blur relative">
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
        {isGuest ? (
          <TopbarGuestWelcome className="absolute left-1/2 hidden -translate-x-1/2 lg:inline-flex" />
        ) : (
          <TopbarSuitIcons className="absolute left-1/2 hidden -translate-x-1/2 md:inline-flex" />
        )}

        <div className="ml-auto flex items-center gap-2">
          <TopbarGlobalSearch className="hidden sm:flex" />
          {!isGuest ? <TopbarNotifications /> : null}
          <TopbarUserMenu user={currentUser} isGuest={isGuest} />
        </div>
      </header>
      <main className="relative flex-1 overflow-auto">
        <div className="relative z-10 px-5 py-4 md:px-8 md:py-6" data-sidebar-state={sidebarState}>
          <DashboardSummaryWidget isGuest={isGuest} />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-4 right-4 hidden h-[300px] w-[520px] lg:block">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[url('/griffon.svg')] bg-contain bg-right-bottom bg-no-repeat opacity-[0.06] [filter:grayscale(1)]"
            />
          </div>
        </div>
      </main>
    </SidebarInset>
  )
}

export default function Page() {
  const { data: session, status } = useSession()
  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status !== "authenticated"
  const currentUser = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  return (
    <SidebarProvider>
      <AppSidebar visualVariant="dense" roles={roles} />
      <DashboardContent isGuest={isGuest} currentUser={currentUser} />
    </SidebarProvider>
  )
}
