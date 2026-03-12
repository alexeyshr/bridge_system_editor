import type { PortalCapability, PortalGlobalRole } from "@/lib/portal-access"

export type DashboardStatConfig = {
  label: string
  value: string
  delta: string
  requires: PortalCapability[]
}

export type DashboardQuickActionConfig = {
  label: string
  requires: PortalCapability[]
}

export const DASHBOARD_STATS: DashboardStatConfig[] = [
  {
    label: "Active tournaments",
    value: "12",
    delta: "+2 this week",
    requires: ["stats.read.basic"],
  },
  {
    label: "New requests",
    value: "47",
    delta: "+9 today",
    requires: ["stats.read.basic"],
  },
  {
    label: "Teams online",
    value: "23",
    delta: "Peak: 31",
    requires: ["stats.read.advanced"],
  },
  {
    label: "Open tasks",
    value: "18",
    delta: "6 high priority",
    requires: ["stats.read.basic"],
  },
]

export const DASHBOARD_QUICK_ACTIONS: DashboardQuickActionConfig[] = [
  { label: "Create tournament", requires: ["tournament.manage"] },
  { label: "Open match calendar", requires: ["tournament.read"] },
  { label: "Generate requests report", requires: ["stats.read.advanced"] },
  { label: "Invite organizer", requires: ["discussion.moderate"] },
  { label: "Create lesson", requires: ["lesson.manage"] },
]

export const DASHBOARD_LEAD_BY_ROLE: Record<PortalGlobalRole | "anonymous", string> = {
  anonymous: "Browse public updates and open topics available to guests.",
  user: "Track your discussions, personal tasks, and current portal updates.",
  teacher: "Review teaching streams, student progress, and lesson planning tasks.",
  judge: "Review current games, rulings, and match-level operational updates.",
  organizer: "Control tournaments, moderation queues, and operational load in one place.",
  admin: "Oversee system health, moderation, and all critical portal workflows.",
}
