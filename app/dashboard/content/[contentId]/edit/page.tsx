"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"

import { ContentEditorWorkspace } from "@/components/content-editor-workspace"
import { PortalPageShell } from "@/components/portal-page-shell"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"

export default function EditContentPage() {
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
        { label: "Edit draft" },
      ]}
    >
      {isGuest ? (
        <div className="mx-auto max-w-4xl rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
          <p className="text-base font-medium text-[#1f2734]">Sign in to edit this draft.</p>
          <a href={`/auth/signin?callbackUrl=/dashboard/content/${encodeURIComponent(contentId)}/edit`} className="mt-2 inline-flex text-sm font-medium text-[#2f466d] hover:underline">
            Go to sign in
          </a>
        </div>
      ) : (
        <ContentEditorWorkspace mode="edit" contentId={contentId} />
      )}
    </PortalPageShell>
  )
}
