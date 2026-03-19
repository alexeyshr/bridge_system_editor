"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFaviconToggle } from "@/components/dashboard-favicon-toggle"
import { TopbarGlobalSearch } from "@/components/topbar-global-search"
import { TopbarGuestWelcome } from "@/components/topbar-guest-welcome"
import { TopbarNotifications } from "@/components/topbar-notifications"
import { TopbarSuitIcons } from "@/components/topbar-suit-icons"
import { TopbarUserMenu } from "@/components/topbar-user-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import type { PortalRole } from "@/lib/portal-access"

export type PortalBreadcrumb = {
  label: string
  href?: string
}

type PortalPageShellProps = {
  roles: PortalRole[]
  isGuest: boolean
  user: {
    name: string
    email: string | null
    image: string | null
  }
  breadcrumbs: PortalBreadcrumb[]
  children: React.ReactNode
  centerSlot?: React.ReactNode
  mainClassName?: string
}

function PortalPageContent({
  isGuest,
  user,
  breadcrumbs,
  children,
  centerSlot,
  mainClassName = "relative flex-1 overflow-auto px-5 py-4 md:px-8 md:py-6",
}: Omit<PortalPageShellProps, "roles">) {
  const { state: sidebarState } = useSidebar()
  const items = breadcrumbs.length > 0 ? breadcrumbs : [{ label: "Portal", href: "/dashboard" }]
  const lastIndex = items.length - 1

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
              {items.map((item, index) => {
                const isLast = index === lastIndex
                return (
                  <React.Fragment key={`${item.label}-${index}`}>
                    <BreadcrumbItem className={index === 0 ? "hidden md:block" : undefined}>
                      {isLast || !item.href ? (
                        <BreadcrumbPage className="text-[#1f2734]">{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href} className="text-[#6e7788]">
                          {item.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator className={index === 0 ? "hidden md:block" : undefined} /> : null}
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {centerSlot ?? (isGuest ? (
          <TopbarGuestWelcome className="absolute left-1/2 hidden -translate-x-1/2 lg:inline-flex" />
        ) : (
          <TopbarSuitIcons className="absolute left-1/2 hidden -translate-x-1/2 md:inline-flex" />
        ))}
        <div className="ml-auto flex items-center gap-2">
          <TopbarGlobalSearch className="hidden sm:flex" />
          {!isGuest ? <TopbarNotifications /> : null}
          <TopbarUserMenu user={user} isGuest={isGuest} />
        </div>
      </header>
      <main className={mainClassName} data-sidebar-state={sidebarState}>{children}</main>
    </SidebarInset>
  )
}

export function PortalPageShell({
  roles,
  ...rest
}: PortalPageShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar visualVariant="dense" roles={roles} />
      <PortalPageContent {...rest} />
    </SidebarProvider>
  )
}
