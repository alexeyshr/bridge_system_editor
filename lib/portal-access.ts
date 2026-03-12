export type PortalAnonymousRole = "anonymous"

export type PortalGlobalRole =
  | "user"
  | "teacher"
  | "judge"
  | "organizer"
  | "admin"

export type PortalScopedRole =
  | "teacher"
  | "judge"
  | "organizer"
  | "admin"

export type PortalRole = PortalAnonymousRole | PortalGlobalRole | PortalScopedRole

export type PortalScopeType = "tournament" | "school"

export type PortalCapability =
  | "feed.read"
  | "feed.sort"
  | "post.create"
  | "discussion.read"
  | "discussion.create"
  | "discussion.moderate"
  | "lesson.read"
  | "lesson.manage"
  | "tournament.read"
  | "tournament.manage"
  | "stats.read.basic"
  | "stats.read.advanced"
  | "system.manage"

export const PORTAL_GLOBAL_ROLE_LABEL: Record<PortalGlobalRole, string> = {
  user: "User",
  teacher: "Teacher",
  judge: "Judge",
  organizer: "Organizer",
  admin: "Admin",
}

export const PORTAL_GLOBAL_ROLES: PortalGlobalRole[] = [
  "user",
  "teacher",
  "judge",
  "organizer",
  "admin",
]

const ANONYMOUS_CAPABILITIES: PortalCapability[] = [
  "feed.read",
  "discussion.read",
  "lesson.read",
]

const ROLE_CAPABILITIES: Record<PortalGlobalRole | PortalScopedRole, PortalCapability[]> = {
  user: [
    "feed.read",
    "feed.sort",
    "post.create",
    "discussion.read",
    "discussion.create",
    "lesson.read",
    "tournament.read",
    "stats.read.basic",
  ],
  teacher: [
    "feed.read",
    "feed.sort",
    "post.create",
    "discussion.read",
    "discussion.create",
    "lesson.read",
    "lesson.manage",
    "tournament.read",
    "stats.read.basic",
    "stats.read.advanced",
  ],
  judge: [
    "feed.read",
    "feed.sort",
    "discussion.read",
    "discussion.create",
    "lesson.read",
    "tournament.read",
    "stats.read.basic",
    "stats.read.advanced",
  ],
  organizer: [
    "feed.read",
    "feed.sort",
    "post.create",
    "discussion.read",
    "discussion.create",
    "discussion.moderate",
    "lesson.read",
    "tournament.read",
    "tournament.manage",
    "stats.read.basic",
    "stats.read.advanced",
  ],
  admin: [
    "feed.read",
    "feed.sort",
    "post.create",
    "discussion.read",
    "discussion.create",
    "discussion.moderate",
    "lesson.read",
    "lesson.manage",
    "tournament.read",
    "tournament.manage",
    "stats.read.basic",
    "stats.read.advanced",
    "system.manage",
  ],
}

export function normalizePortalRoles(input: PortalRole[] | undefined | null): PortalRole[] {
  const roles = (input ?? []).filter(Boolean)
  if (roles.length === 0) return ["anonymous"]
  return [...new Set(roles)]
}

export function listCapabilitiesForRoles(input: PortalRole[] | undefined | null): PortalCapability[] {
  const roles = normalizePortalRoles(input)
  const capabilities = new Set<PortalCapability>()

  for (const role of roles) {
    if (role === "anonymous") {
      ANONYMOUS_CAPABILITIES.forEach((capability) => capabilities.add(capability))
      continue
    }

    const roleCapabilities = ROLE_CAPABILITIES[role]
    roleCapabilities.forEach((capability) => capabilities.add(capability))
  }

  return [...capabilities]
}

export function hasCapability(
  capabilities: readonly PortalCapability[],
  capability: PortalCapability
) {
  return capabilities.includes(capability)
}

export function hasAnyCapability(
  capabilities: readonly PortalCapability[],
  required: readonly PortalCapability[]
) {
  return required.some((capability) => capabilities.includes(capability))
}

export function formatPortalRoleSummary(input: PortalRole[] | undefined | null) {
  const roles = normalizePortalRoles(input).filter(
    (role): role is PortalGlobalRole => role !== "anonymous"
  )
  if (roles.length === 0) return "Guest"
  return roles.map((role) => PORTAL_GLOBAL_ROLE_LABEL[role]).join(" + ")
}
