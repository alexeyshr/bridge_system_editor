"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"

import { DealStudyWorkspace } from "@/components/deal-study-workspace"
import { PortalPageShell } from "@/components/portal-page-shell"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"

export default function ContentDealStudyPage() {
  const { data: session, status } = useSession()
  const params = useParams<{ contentId: string }>()
  const contentId = useMemo(() => params?.contentId ?? "", [params?.contentId])

  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status !== "authenticated"
  const user = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  return (
    <PortalPageShell
      roles={roles}
      isGuest={isGuest}
      user={user}
      breadcrumbs={[
        { label: "Portal", href: "/dashboard" },
        { label: "Content", href: "/dashboard/content" },
        { label: "Deal studio" },
      ]}
    >
      <DealStudyWorkspace contentId={contentId} />
    </PortalPageShell>
  )
}

