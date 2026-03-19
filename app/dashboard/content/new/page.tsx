"use client"

import { useSession } from "next-auth/react"

import { ContentEditorWorkspace } from "@/components/content-editor-workspace"
import { PortalPageShell } from "@/components/portal-page-shell"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"

export default function NewContentPage() {
  const { data: session, status } = useSession()
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
        { label: "New draft" },
      ]}
    >
      {isGuest ? (
        <div className="border-b border-[#e5e7eb] pb-5">
          <p className="text-base font-medium text-[#1f2734]">Sign in to create content drafts.</p>
          <a href="/auth/signin?callbackUrl=/dashboard/content/new" className="mt-2 inline-flex text-sm font-medium text-[#1f2734] underline decoration-[#9ca3af] underline-offset-2 transition hover:decoration-[#1f2734]">
            Go to sign in
          </a>
        </div>
      ) : (
        <ContentEditorWorkspace mode="create" />
      )}
    </PortalPageShell>
  )
}
