"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  BookOpenIcon,
  CalendarIcon,
  FlaskConicalIcon,
  HomeIcon,
  MessageSquareIcon,
  NewspaperIcon,
  ShieldCheckIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

const primaryItems: NavItem[] = [
  { title: "Frontpage", url: "/dashboard", icon: HomeIcon },
  { title: "Latest", url: "#", icon: NewspaperIcon },
  { title: "Discussions", url: "#", icon: MessageSquareIcon },
  { title: "Sequences", url: "#", icon: BookOpenIcon },
]

const operationsItems: NavItem[] = [
  { title: "Calendar", url: "#", icon: CalendarIcon },
  { title: "Experiments", url: "#", icon: FlaskConicalIcon },
  { title: "Moderation", url: "#", icon: ShieldCheckIcon },
  { title: "Tools", url: "#", icon: WrenchIcon },
]

const user = {
  name: "Portal Admin",
  email: "admin@bridge.local",
  avatar: "https://github.com/shadcn.png",
}

export type DashboardVisualVariant = "dense" | "editorial" | "mono"

const sidebarThemes: Record<
  DashboardVisualVariant,
  {
    shell: string
    header: string
    eyebrow: string
    title: string
    input: string
    content: string
    groupLabel: string
    menuButton: string
    separator: string
    footer: string
  }
> = {
  dense: {
    shell: "border-r border-[#d8dbe1] bg-[#f3f5f9] text-[#1f2734]",
    header: "gap-2 border-b border-[#d8dbe1] px-2 py-3",
    eyebrow: "text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]",
    title: "text-[13px] font-semibold text-[#1f2734]",
    input:
      "h-7 rounded-md border-[#cfd5df] bg-white text-[#1f2734] placeholder:text-[#7b8392]",
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
    header: "gap-3 border-b border-[#e6dfd2] px-3 py-4",
    eyebrow: "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b756b]",
    title: "text-sm font-semibold text-[#1f1b16]",
    input:
      "h-8 border-[#ddd4c6] bg-[#fcfaf4] text-[#2f2a21] placeholder:text-[#8f887b]",
    content: "gap-0 px-2 py-2",
    groupLabel: "text-[11px] uppercase tracking-[0.12em] text-[#7b756b]",
    menuButton:
      "text-[13px] font-medium hover:bg-[#ece5d8] hover:text-[#1f1b16] data-active:bg-[#e4dccd] data-active:text-[#1f1b16]",
    separator: "mx-0 bg-[#e6dfd2]",
    footer: "border-t border-[#e6dfd2] px-2 py-2",
  },
  mono: {
    shell: "border-r border-zinc-300 bg-zinc-100 text-zinc-900",
    header: "gap-3 border-b border-zinc-300 px-3 py-4",
    eyebrow: "text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500",
    title: "text-sm font-semibold text-zinc-900",
    input:
      "h-8 border-zinc-300 bg-zinc-50 text-zinc-900 placeholder:text-zinc-500",
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
  ...props
}: React.ComponentProps<typeof Sidebar> & { visualVariant?: DashboardVisualVariant }) {
  const pathname = usePathname()
  const theme = sidebarThemes[visualVariant]

  const renderMenu = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = item.url !== "#" && pathname === item.url
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
    <Sidebar
      collapsible="offcanvas"
      className={theme.shell}
      {...props}
    >
      <SidebarHeader className={theme.header}>
        <div className="space-y-2">
          <div className="px-1 py-1">
            <Image
              src="/main-logo-transparent.png"
              alt="Bridge OneClub"
              width={2854}
              height={1234}
              className="h-auto w-full max-w-[170px]"
              priority
            />
          </div>
        </div>
        <SidebarInput
          placeholder="Search posts, teams, notes..."
          className={theme.input}
        />
      </SidebarHeader>
      <SidebarContent className={theme.content}>
        <SidebarGroup>
          <SidebarGroupLabel className={theme.groupLabel}>
            Reading
          </SidebarGroupLabel>
          {renderMenu(primaryItems)}
        </SidebarGroup>
        <SidebarSeparator className={theme.separator} />
        <SidebarGroup>
          <SidebarGroupLabel className={theme.groupLabel}>
            Operations
          </SidebarGroupLabel>
          {renderMenu(operationsItems)}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className={theme.footer}>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
