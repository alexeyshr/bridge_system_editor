"use client"

import * as React from "react"
import { useSession } from "next-auth/react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFaviconToggle } from "@/components/dashboard-favicon-toggle"
import { TopbarGuestWelcome } from "@/components/topbar-guest-welcome"
import { TopbarGlobalSearch } from "@/components/topbar-global-search"
import { TopbarNotifications } from "@/components/topbar-notifications"
import { TopbarSuitIcons } from "@/components/topbar-suit-icons"
import { TopbarUserMenu } from "@/components/topbar-user-menu"
import {
  normalizePortalRoles,
  type PortalRole,
} from "@/lib/portal-access"
import { cn } from "@/lib/utils"
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

type DashboardShellBreadcrumb = {
  label: string
  href?: string
}

export function DashboardShellPage({
  breadcrumbs,
  children,
  mainClassName,
  showCenterContent = true,
}: {
  breadcrumbs: DashboardShellBreadcrumb[]
  children: React.ReactNode
  mainClassName?: string
  showCenterContent?: boolean
}) {
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
      <SidebarInset className="h-svh overflow-hidden bg-[#f6f7fb]">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[#d8dbe1] bg-[#f6f7fb]/95 px-4 backdrop-blur relative">
          <div className="flex items-center gap-2">
            <DashboardFaviconToggle />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto [&[data-slot=separator]]:bg-[#cfd5df]"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <React.Fragment key={`${item.label}-${index}`}>
                      {index > 0 ? <BreadcrumbSeparator /> : null}
                      <BreadcrumbItem>
                        {isLast || !item.href ? (
                          <BreadcrumbPage className="text-[#1f2734]">{item.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={item.href} className="text-[#6e7788]">
                            {item.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {showCenterContent ? (
            isGuest ? (
              <TopbarGuestWelcome className="absolute left-1/2 hidden -translate-x-1/2 lg:inline-flex" />
            ) : (
              <TopbarSuitIcons className="absolute left-1/2 hidden -translate-x-1/2 md:inline-flex" />
            )
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <TopbarGlobalSearch className="hidden sm:flex" />
            {!isGuest ? <TopbarNotifications /> : null}
            <TopbarUserMenu user={currentUser} isGuest={isGuest} />
          </div>
        </header>
        <main className={cn("relative flex-1 overflow-auto p-4 md:p-6", mainClassName)}>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

