import type { PortalCapability } from "@/lib/portal-access"

export type SidebarIconKey =
  | "home"
  | "newspaper"
  | "message"
  | "book"
  | "calendar"
  | "chart"
  | "history"
  | "search"
  | "flask"
  | "shield"
  | "wrench"

export type SidebarItemConfig = {
  title: string
  url: string
  icon: SidebarIconKey
  requires?: PortalCapability[]
}

export type SidebarGroupConfig = {
  id: string
  label: string
  items: SidebarItemConfig[]
}

export const SIDEBAR_GROUPS: SidebarGroupConfig[] = [
  {
    id: "main",
    label: "Main",
    items: [
      { title: "Frontpage", url: "/dashboard", icon: "home", requires: ["feed.read"] },
      { title: "Content", url: "/dashboard/content", icon: "newspaper", requires: ["feed.read"] },
      { title: "Learning", url: "/dashboard/learning", icon: "book", requires: ["feed.read"] },
      { title: "Library", url: "/dashboard/library", icon: "search", requires: ["feed.read"] },
      { title: "Spaces", url: "/dashboard/spaces", icon: "message", requires: ["feed.read"] },
    ],
  },
  {
    id: "tournaments",
    label: "Tournaments",
    items: [
      { title: "Calendar", url: "/dashboard/tournaments/calendar", icon: "calendar", requires: ["feed.read"] },
      { title: "Results", url: "/dashboard/tournaments/results", icon: "chart", requires: ["feed.read"] },
    ],
  },
  {
    id: "players",
    label: "Players",
    items: [
      { title: "Ratings", url: "/dashboard/players/ratings", icon: "chart", requires: ["feed.read"] },
      { title: "History", url: "/dashboard/players/history", icon: "history", requires: ["feed.read"] },
      { title: "Search", url: "/dashboard/players/search", icon: "search", requires: ["feed.read"] },
    ],
  },
  {
    id: "instruments",
    label: "Instruments",
    items: [
      { title: "Deal Studio", url: "/dashboard/instruments/deal-studio", icon: "flask", requires: ["feed.read"] },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { title: "Tournament desk", url: "/dashboard/tournaments/demo", icon: "shield", requires: ["tournament.read"] },
    ],
  },
]
