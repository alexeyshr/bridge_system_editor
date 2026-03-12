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
    id: "reading",
    label: "Reading",
    items: [
      { title: "Frontpage", url: "/dashboard", icon: "home", requires: ["feed.read"] },
      { title: "Latest", url: "#", icon: "newspaper", requires: ["feed.read"] },
      { title: "Discussions", url: "#", icon: "message", requires: ["discussion.read"] },
      { title: "Sequences", url: "#", icon: "book", requires: ["lesson.read"] },
    ],
  },
  {
    id: "tournaments",
    label: "Tournaments",
    items: [
      { title: "Calendar", url: "/dashboard/tournaments/calendar", icon: "calendar", requires: ["feed.read"] },
      { title: "Results", url: "/dashboard/tournaments/results", icon: "newspaper", requires: ["feed.read"] },
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
    id: "education",
    label: "Education",
    items: [
      { title: "Learning tracks", url: "#", icon: "book", requires: ["lesson.read"] },
      { title: "Course studio", url: "#", icon: "flask", requires: ["lesson.manage"] },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { title: "Tournament desk", url: "/dashboard/tournaments/demo", icon: "shield", requires: ["tournament.read"] },
      { title: "Moderation", url: "#", icon: "shield", requires: ["discussion.moderate"] },
      { title: "Tools", url: "#", icon: "wrench", requires: ["system.manage"] },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { title: "System settings", url: "#", icon: "wrench", requires: ["system.manage"] },
    ],
  },
]
