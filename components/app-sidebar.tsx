"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  BarChart3Icon,
  BookOpenIcon,
  CalendarIcon,
  FlaskConicalIcon,
  HistoryIcon,
  HomeIcon,
  MessageSquareIcon,
  NewspaperIcon,
  PanelTopCloseIcon,
  PanelTopOpenIcon,
  SearchIcon,
  ShieldCheckIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

import {
  type SidebarIconKey,
  SIDEBAR_GROUPS,
} from "@/lib/portal-config/sidebar"
import {
  type PortalRole,
  hasAnyCapability,
  listCapabilitiesForRoles,
} from "@/lib/portal-access"
import { BridgePortalLogo } from "@/components/bridge-portal-logo"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const SIDEBAR_ICONS: Record<SidebarIconKey, LucideIcon> = {
  home: HomeIcon,
  newspaper: NewspaperIcon,
  message: MessageSquareIcon,
  book: BookOpenIcon,
  calendar: CalendarIcon,
  chart: BarChart3Icon,
  history: HistoryIcon,
  search: SearchIcon,
  flask: FlaskConicalIcon,
  shield: ShieldCheckIcon,
  wrench: WrenchIcon,
}

export type DashboardVisualVariant = "dense" | "editorial" | "mono"
const SIDEBAR_LOGO_COLLAPSED_KEY = "portal.sidebar.logo.collapsed"

export function AppSidebar({
  visualVariant: _visualVariant = "dense",
  roles = ["anonymous"],
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  visualVariant?: DashboardVisualVariant
  roles?: PortalRole[]
}) {
  const pathname = usePathname()
  const capabilities = listCapabilitiesForRoles(roles)
  const [logoCollapsed, setLogoCollapsed] = React.useState(false)

  React.useEffect(() => {
    const persisted = window.localStorage.getItem(SIDEBAR_LOGO_COLLAPSED_KEY)
    if (persisted === "1") {
      setLogoCollapsed(true)
    }
  }, [])

  React.useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_LOGO_COLLAPSED_KEY,
      logoCollapsed ? "1" : "0"
    )
  }, [logoCollapsed])

  const visibleGroups = SIDEBAR_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      !item.requires || hasAnyCapability(capabilities, item.requires)
    ),
  })).filter((group) => group.items.length > 0)

  const logoToggleLabel = logoCollapsed ? "Show logo" : "Hide logo"

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-[#e5e7eb] bg-white text-[#374151]"
      {...props}
    >
      <SidebarHeader className={cn("px-3 py-3", logoCollapsed && "py-2")}>
        <div className="flex items-center justify-end">
          <button
            type="button"
            data-tooltip={logoToggleLabel}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#374151] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca3af]"
            onClick={() => setLogoCollapsed((prev) => !prev)}
          >
            {logoCollapsed ? (
              <PanelTopOpenIcon className="size-3.5" />
            ) : (
              <PanelTopCloseIcon className="size-3.5" />
            )}
          </button>
        </div>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            logoCollapsed
              ? "max-h-0 -translate-y-1 opacity-0"
              : "max-h-[200px] translate-y-0 opacity-100"
          )}
        >
          <div className="py-0.5">
            <BridgePortalLogo className="w-full max-w-[228px]" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-1">
        {visibleGroups.map((group, index) => (
          <SidebarGroup key={group.id} className={cn(index > 0 && "mt-2")}>
            <SidebarGroupLabel className="mb-0.5 px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[#9ca3af] group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = SIDEBAR_ICONS[item.icon]
                const isActive =
                  item.url !== "#" &&
                  (
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(`${item.url}/`))
                  )
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<a href={item.url} />}
                      className={cn(
                        "h-8 rounded-md px-2 text-[13px] font-normal text-[#6b7280] transition-colors",
                        "hover:bg-[#f3f4f6] hover:text-[#1f2734]",
                        isActive && "bg-[#f3f4f6] font-medium text-[#1f2734]",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
