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
        <div className="mx-auto max-w-4xl rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
          <p className="text-base font-medium text-[#1f2734]">Sign in to create content drafts.</p>
          <a href="/auth/signin?callbackUrl=/dashboard/content/new" className="mt-2 inline-flex text-sm font-medium text-[#2f466d] hover:underline">
            Go to sign in
          </a>
        </div>
      ) : (
        <ContentEditorWorkspace mode="create" />
      )}
    </PortalPageShell>
  )
}
