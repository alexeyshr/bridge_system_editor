import type { PortalCapability } from "@/lib/portal-access"

export type HeaderCreateActionConfig = {
  id: string
  label: string
  href: string
  requires: PortalCapability[]
}

export const HEADER_CREATE_ACTIONS: HeaderCreateActionConfig[] = [
  { id: "create-post", label: "Create post", href: "#", requires: ["post.create"] },
  { id: "start-discussion", label: "Start discussion", href: "#", requires: ["discussion.create"] },
  { id: "create-lesson", label: "Create lesson", href: "#", requires: ["lesson.manage"] },
  { id: "create-tournament", label: "Create tournament", href: "#", requires: ["tournament.manage"] },
  { id: "create-system-workspace", label: "Create system workspace", href: "#", requires: ["system.manage"] },
]
