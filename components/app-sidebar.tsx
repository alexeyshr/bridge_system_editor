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
  formatPortalRoleSummary,
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
  SidebarSeparator,
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

const sidebarThemes: Record<
  DashboardVisualVariant,
  {
    shell: string
    header: string
    content: string
    groupLabel: string
    menuButton: string
    separator: string
    footer: string
  }
> = {
  dense: {
    shell: "border-r border-[#d8dbe1] bg-[#f3f5f9] text-[#1f2734]",
    header: "gap-1.5 border-b border-[#d8dbe1] px-2 py-2.5",
    content: "gap-0 px-1 py-2",
    groupLabel:
      "text-[10px] uppercase tracking-[0.1em] text-[#707887] group-data-[collapsible=icon]:hidden",
    menuButton:
      "h-7 rounded-md text-[12px] font-medium hover:bg-[#e4e8f0] hover:text-[#111827] data-active:bg-[#dde3ed] data-active:text-[#111827]",
    separator: "mx-1 bg-[#d8dbe1]",
    footer: "border-t border-[#d8dbe1] px-1 py-2",
  },
  editorial: {
    shell: "border-r border-[#e6dfd2] bg-[#f7f3ea] text-[#2f2a21]",
    header: "gap-2 border-b border-[#e6dfd2] px-3 py-3.5",
    content: "gap-0 px-2 py-2",
    groupLabel: "text-[11px] uppercase tracking-[0.12em] text-[#7b756b]",
    menuButton:
      "text-[13px] font-medium hover:bg-[#ece5d8] hover:text-[#1f1b16] data-active:bg-[#e4dccd] data-active:text-[#1f1b16]",
    separator: "mx-0 bg-[#e6dfd2]",
    footer: "border-t border-[#e6dfd2] px-2 py-2",
  },
  mono: {
    shell: "border-r border-zinc-300 bg-zinc-100 text-zinc-900",
    header: "gap-2 border-b border-zinc-300 px-3 py-3.5",
    content: "gap-0 px-2 py-2",
    groupLabel: "text-[11px] uppercase tracking-[0.12em] text-zinc-500",
    menuButton:
      "text-[13px] font-medium hover:bg-zinc-200 hover:text-zinc-950 data-active:bg-zinc-300 data-active:text-zinc-950",
    separator: "mx-0 bg-zinc-300",
    footer: "border-t border-zinc-300 px-2 py-2",
  },
}

export function AppSidebar({
  visualVariant = "dense",
  roles = ["anonymous"],
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  visualVariant?: DashboardVisualVariant
  roles?: PortalRole[]
}) {
  const pathname = usePathname()
  const theme = sidebarThemes[visualVariant]
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

  const profileLabel = formatPortalRoleSummary(roles)
  const logoToggleLabel = logoCollapsed ? "Show logo" : "Hide logo"

  const renderMenu = (
    items: Array<{ title: string; url: string; icon: SidebarIconKey }>
  ) => (
    <SidebarMenu>
      {items.map((item) => {
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
              className={cn("transition-colors", theme.menuButton)}
            >
              <Icon className="size-4" />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )

  return (
    <Sidebar collapsible="offcanvas" className={theme.shell} {...props}>
      <SidebarHeader className={cn(theme.header, logoCollapsed && "gap-0 py-1.5")}>
        <div className="flex items-center justify-end px-1">
          <button
            type="button"
            aria-label={logoToggleLabel}
            title={logoToggleLabel}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-transparent text-[#6a7589] transition-colors hover:bg-[#ebf0f8]/70 hover:text-[#1f2734] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa5bb]"
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
            "space-y-1 overflow-hidden transition-all duration-200",
            logoCollapsed
              ? "max-h-0 -translate-y-1 opacity-0"
              : "max-h-[260px] translate-y-0 opacity-100"
          )}
        >
          <div className="px-1">
            <div className="py-0.5">
              <BridgePortalLogo className="w-full max-w-[228px]" />
            </div>
          </div>
          <div className="mx-2 h-px bg-[#d8dbe1]/90" />
          <div className="mx-1 px-2 py-1.5">
            <div className="flex items-center gap-1.5 text-[#7b8392]">
              <ShieldCheckIcon className="size-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-[0.12em]">
                Access profile
              </span>
            </div>
            <p className="mt-1 truncate text-[12px] font-semibold uppercase tracking-[0.08em] text-[#2b3446]">
              {profileLabel}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className={theme.content}>
        {visibleGroups.map((group, index) => (
          <React.Fragment key={group.id}>
            {index > 0 ? <SidebarSeparator className={theme.separator} /> : null}
            <SidebarGroup>
              <SidebarGroupLabel className={theme.groupLabel}>
                {group.label}
              </SidebarGroupLabel>
              {renderMenu(group.items)}
            </SidebarGroup>
          </React.Fragment>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
