
"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useMemo, useRef, useState } from "react"
import {
  BellRingIcon,
  CheckCheckIcon,
  CircleHelpIcon,
  CompassIcon,
  CopyIcon,
  LockIcon,
  MailPlusIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { PortalPageShell } from "@/components/portal-page-shell"
import { Button } from "@/components/ui/button"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import { trpc } from "@/lib/trpc/react"
import { cn } from "@/lib/utils"

type RequestStatus = "pending" | "approved" | "rejected" | "cancelled"
type InviteStatus = "pending" | "accepted" | "revoked" | "expired"
type SpaceMemberRole = "owner" | "admin" | "editor" | "member"

function statusLabel(status: RequestStatus) {
  if (status === "pending") return "Request pending"
  if (status === "approved") return "Approved"
  if (status === "rejected") return "Rejected"
  return "Cancelled"
}

function inviteStatusLabel(status: InviteStatus) {
  if (status === "pending") return "Pending"
  if (status === "accepted") return "Accepted"
  if (status === "revoked") return "Revoked"
  return "Expired"
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export default function SpacesDirectoryPage() {
  const incomingSpaceId = useMemo(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("spaceId")
  }, [])

  const { data: session, status } = useSession()
  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status !== "authenticated"
  const user = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  const [query, setQuery] = useState("")
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [showCreateSpaceForm, setShowCreateSpaceForm] = useState(false)
  const controlsPanelRef = useRef<HTMLElement | null>(null)

  const [createName, setCreateName] = useState("")
  const [createSlug, setCreateSlug] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createVisibility, setCreateVisibility] = useState<"public" | "hidden">("hidden")
  const [createJoinPolicy, setCreateJoinPolicy] = useState<"request" | "invite_only">("invite_only")
  const [createReviewPolicy, setCreateReviewPolicy] = useState<"none" | "required">("none")

  const [inviteRole, setInviteRole] = useState<Extract<SpaceMemberRole, "admin" | "editor" | "member">>("member")
  const [inviteTargetEmail, setInviteTargetEmail] = useState("")
  const [inviteExpiresHours, setInviteExpiresHours] = useState("72")

  const spacesQuery = trpc.spaces.list.useQuery(query.trim() ? { query: query.trim() } : undefined, { staleTime: 20_000 })
  const myRequestsQuery = trpc.spaces.joinRequests.mine.useQuery(undefined, { enabled: !isGuest, staleTime: 20_000 })

  const spaces = useMemo(() => spacesQuery.data?.spaces ?? [], [spacesQuery.data?.spaces])
  const memberSpaces = useMemo(() => spaces.filter((space) => space.actorRole !== "guest"), [spaces])
  const activeSelectedSpaceId = useMemo(() => {
    if (incomingSpaceId && memberSpaces.some((space) => space.id === incomingSpaceId)) {
      return incomingSpaceId
    }
    if (selectedSpaceId && memberSpaces.some((space) => space.id === selectedSpaceId)) {
      return selectedSpaceId
    }
    return memberSpaces[0]?.id ?? null
  }, [incomingSpaceId, memberSpaces, selectedSpaceId])

  const selectedSpace = useMemo(
    () => memberSpaces.find((space) => space.id === activeSelectedSpaceId) ?? null,
    [activeSelectedSpaceId, memberSpaces],
  )
  const canManageSpace = !!selectedSpace?.capabilities.includes("space.manage")
  const canManageMembers = !!selectedSpace?.capabilities.includes("space.members.manage")
  const canManageInvites = !!selectedSpace?.capabilities.includes("space.invites.manage")

  const requestBySpace = useMemo(() => {
    const map = new Map<string, { id: string; status: RequestStatus }>()
    for (const request of myRequestsQuery.data?.requests ?? []) {
      if (!map.has(request.spaceId)) {
        map.set(request.spaceId, { id: request.id, status: request.status })
      }
    }
    return map
  }, [myRequestsQuery.data?.requests])

  const joinRequestsQuery = trpc.spaces.joinRequests.list.useQuery(
    { spaceId: selectedSpace?.id ?? "__disabled__" },
    { enabled: !!selectedSpace?.id && canManageMembers, staleTime: 5_000 },
  )
  const invitesQuery = trpc.spaces.invites.list.useQuery(
    { spaceId: selectedSpace?.id ?? "__disabled__" },
    { enabled: !!selectedSpace?.id && canManageInvites, staleTime: 5_000 },
  )
  const requestMutation = trpc.spaces.joinRequests.create.useMutation({
    onSuccess: async () => {
      setNotice({ type: "success", message: "Join request sent." })
      await Promise.all([spacesQuery.refetch(), myRequestsQuery.refetch()])
    },
    onError: (error) => setNotice({ type: "error", message: error.message || "Failed to create join request." }),
  })

  const createSpaceMutation = trpc.spaces.create.useMutation({
    onSuccess: async (result) => {
      setNotice({ type: "success", message: "Space created." })
      setCreateName("")
      setCreateSlug("")
      setCreateDescription("")
      setCreateVisibility("hidden")
      setCreateJoinPolicy("invite_only")
      setCreateReviewPolicy("none")
      setShowCreateSpaceForm(false)
      setSelectedSpaceId(result.space.id)
      await spacesQuery.refetch()
    },
    onError: (error) => setNotice({ type: "error", message: error.message || "Failed to create space." }),
  })

  const updateSpaceMutation = trpc.spaces.update.useMutation({
    onSuccess: async () => {
      setNotice({ type: "success", message: "Space settings updated." })
      await spacesQuery.refetch()
    },
    onError: (error) => setNotice({ type: "error", message: error.message || "Failed to update space." }),
  })

  const reviewJoinRequestMutation = trpc.spaces.joinRequests.review.useMutation({
    onSuccess: async () => {
      setNotice({ type: "success", message: "Join request updated." })
      await Promise.all([joinRequestsQuery.refetch(), spacesQuery.refetch(), myRequestsQuery.refetch()])
    },
    onError: (error) => setNotice({ type: "error", message: error.message || "Failed to review join request." }),
  })

  const createInviteMutation = trpc.spaces.invites.create.useMutation({
    onSuccess: async () => {
      setNotice({ type: "success", message: "Invite created." })
      setInviteTargetEmail("")
      setInviteRole("member")
      setInviteExpiresHours("72")
      await invitesQuery.refetch()
    },
    onError: (error) => setNotice({ type: "error", message: error.message || "Failed to create invite." }),
  })

  const revokeInviteMutation = trpc.spaces.invites.revoke.useMutation({
    onSuccess: async () => {
      setNotice({ type: "success", message: "Invite revoked." })
      await invitesQuery.refetch()
    },
    onError: (error) => setNotice({ type: "error", message: error.message || "Failed to revoke invite." }),
  })

  const pendingJoinRequests = (joinRequestsQuery.data?.requests ?? []).filter((request) => request.status === "pending")
  const recentInvites = invitesQuery.data?.invites ?? []

  const invalidCreateSlug = createSlug.trim().length > 0 && !isValidSlug(createSlug.trim())

  async function handleCopyInvite(inviteId: string, inviteUrl: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedInviteId(inviteId)
      setNotice({ type: "success", message: "Invite link copied." })
      setTimeout(() => setCopiedInviteId((current) => (current === inviteId ? null : current)), 1500)
    } catch {
      setNotice({ type: "error", message: "Failed to copy link." })
    }
  }

  function handleCreateSpaceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isGuest || createSpaceMutation.isPending) return
    if (!createName.trim()) return setNotice({ type: "error", message: "Space name is required." })
    if (invalidCreateSlug) return setNotice({ type: "error", message: "Slug format is invalid." })

    createSpaceMutation.mutate({
      name: createName.trim(),
      description: createDescription.trim() ? createDescription.trim() : null,
      slug: createSlug.trim() ? createSlug.trim() : undefined,
      type: "team",
      visibility: createVisibility,
      joinPolicy: createJoinPolicy,
      reviewPolicy: createReviewPolicy,
    })
  }

  function handleUpdateSpaceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSpace || !canManageSpace || updateSpaceMutation.isPending) return
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "").trim()
    const slug = String(formData.get("slug") ?? "").trim()
    const description = String(formData.get("description") ?? "").trim()
    const visibility = String(formData.get("visibility") ?? selectedSpace.visibility) as "public" | "hidden"
    const joinPolicy = String(formData.get("joinPolicy") ?? selectedSpace.joinPolicy) as "request" | "invite_only"
    const reviewPolicy = String(formData.get("reviewPolicy") ?? selectedSpace.reviewPolicy) as "none" | "required"
    if (!name) return setNotice({ type: "error", message: "Space name is required." })
    if (slug && !isValidSlug(slug)) return setNotice({ type: "error", message: "Slug format is invalid." })

    updateSpaceMutation.mutate({
      spaceId: selectedSpace.id,
      data: {
        name,
        description: description || null,
        slug: slug || undefined,
        visibility: selectedSpace.type === "personal" ? undefined : visibility,
        joinPolicy: selectedSpace.type === "personal" ? undefined : joinPolicy,
        reviewPolicy,
      },
    })
  }

  function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSpace || !canManageInvites || createInviteMutation.isPending) return
    if (!inviteTargetEmail.trim()) return setNotice({ type: "error", message: "Invite email is required." })

    createInviteMutation.mutate({
      spaceId: selectedSpace.id,
      data: {
        role: inviteRole,
        targetEmail: inviteTargetEmail.trim(),
        expiresInHours: Number(inviteExpiresHours),
      },
    })
  }

  function handleOpenControls(spaceId: string) {
    setSelectedSpaceId(spaceId)
    requestAnimationFrame(() => {
      controlsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <PortalPageShell
      roles={roles}
      isGuest={isGuest}
      user={user}
      breadcrumbs={[
        { label: "Portal", href: "/dashboard" },
        { label: "Spaces" },
      ]}
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#1f2734]">Spaces workspace</h1>
              <p className="mt-1 text-sm text-[#6e7788]">Discover communities, manage policies, moderate join requests, and operate invites.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 py-1 text-xs font-medium text-[#5f6a7b]"><CompassIcon className="size-3.5" />Visible: {spaces.length}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 py-1 text-xs font-medium text-[#5f6a7b]"><UsersIcon className="size-3.5" />Mine: {memberSpaces.length}</span>
            </div>
          </div>
          <div className="mt-3 relative w-full max-w-md">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#6e7788]" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search spaces..." className="h-10 w-full rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] pl-8 pr-3 text-sm text-[#1f2734] outline-none transition focus:border-[#9bb0d7] focus:bg-white" />
          </div>
        </section>

        {notice ? (
          <section className={cn("rounded-xl border px-3 py-2 text-sm", notice.type === "success" ? "border-[#bbdcc8] bg-[#effaf3] text-[#2f634a]" : "border-[#e5cad0] bg-[#fff2f4] text-[#8b3240]")}>
            <span className="inline-flex items-center gap-1.5">{notice.type === "success" ? <CheckCheckIcon className="size-4" /> : <BellRingIcon className="size-4" />}{notice.message}</span>
          </section>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            <section className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#1f2734]">Directory</h2>
                {!isGuest ? (
                  <Button variant="secondary" size="sm" onClick={() => setShowCreateSpaceForm((current) => !current)}>
                    <PlusIcon data-icon="inline-start" />{showCreateSpaceForm ? "Hide create form" : "Create team space"}
                  </Button>
                ) : (
                  <Link href="/auth/signin?callbackUrl=/dashboard/spaces" className="text-sm font-medium text-[#2f466d] hover:underline">Sign in to create</Link>
                )}
              </div>
              {showCreateSpaceForm && !isGuest ? (
                <form onSubmit={handleCreateSpaceSubmit} className="mt-3 grid gap-2 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3">
                  <input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Space name" className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]" />
                  <input value={createSlug} onChange={(event) => setCreateSlug(event.target.value)} placeholder="Slug (optional)" className={cn("h-9 rounded-lg border bg-white px-2.5 text-sm text-[#1f2734]", invalidCreateSlug ? "border-[#d99aa6]" : "border-[#cfd5df]")} />
                  <textarea value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="Description (optional)" className="min-h-[72px] rounded-lg border border-[#cfd5df] bg-white px-2.5 py-2 text-sm text-[#1f2734]" />
                  <div className="grid gap-2 md:grid-cols-3">
                    <select value={createVisibility} onChange={(event) => setCreateVisibility(event.target.value as "public" | "hidden")} className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]"><option value="hidden">Hidden space</option><option value="public">Public space</option></select>
                    <select value={createJoinPolicy} onChange={(event) => setCreateJoinPolicy(event.target.value as "request" | "invite_only")} className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]"><option value="invite_only">Join: invite only</option><option value="request">Join: request</option></select>
                    <select value={createReviewPolicy} onChange={(event) => setCreateReviewPolicy(event.target.value as "none" | "required")} className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]"><option value="none">Review: none</option><option value="required">Review: required</option></select>
                  </div>
                  <div className="flex justify-end"><Button type="submit" variant="secondary" size="sm" disabled={createSpaceMutation.isPending}>{createSpaceMutation.isPending ? "Creating..." : "Create space"}</Button></div>
                </form>
              ) : null}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {spaces.map((space) => {
                  const request = requestBySpace.get(space.id)
                  const canRequest = space.actorRole === "guest" && space.joinPolicy === "request" && !isGuest
                  return (
                    <article key={space.id} className={cn("rounded-xl border bg-white/90 p-3 shadow-sm transition", selectedSpace?.id === space.id ? "border-[#9bb0d7]" : "border-[#d8dbe1]")}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-[#1f2734]">{space.name}</h3>
                          <p className="mt-0.5 text-xs uppercase tracking-[0.08em] text-[#7a8394]">{space.visibility} / {space.joinPolicy}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]"><UsersIcon className="size-3.5" />{space.actorRole}</span>
                      </div>
                      <p className="mt-2 text-sm text-[#5f6a7b]">{space.description || "No description yet."}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        {space.actorRole !== "guest" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenControls(space.id)}
                            disabled={selectedSpace?.id === space.id}
                            className="inline-flex h-8 items-center rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-2.5 text-xs font-medium text-[#2f466d] hover:bg-[#e2ebfa] disabled:cursor-default disabled:opacity-60 disabled:hover:bg-[#eef3fb]"
                          >
                            {selectedSpace?.id === space.id ? "Controls open" : "Open controls"}
                          </button>
                        ) : request ? (
                          <span className="text-xs font-medium text-[#6e7788]">{statusLabel(request.status)}</span>
                        ) : space.joinPolicy === "invite_only" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#6e7788]"><LockIcon className="size-3.5" />Invite required</span>
                        ) : isGuest ? (
                          <span className="text-xs text-[#6e7788]">Sign in to request access</span>
                        ) : (
                          <span className="text-xs text-[#6e7788]">No request yet</span>
                        )}
                        {canRequest ? (
                          <button type="button" onClick={() => requestMutation.mutate({ spaceId: space.id, data: {} })} disabled={requestMutation.isPending || request?.status === "pending"} className="h-8 rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-3 text-xs font-medium text-[#2f466d] transition hover:bg-[#e2ebfa] disabled:cursor-not-allowed disabled:opacity-60">{request?.status === "pending" ? "Pending" : "Request join"}</button>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            {!isGuest ? (
              <section className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1f2734]">My join requests</h2>
                <div className="mt-3 space-y-2">
                  {(myRequestsQuery.data?.requests ?? []).slice(0, 6).map((request) => (
                    <article key={request.id} className="rounded-lg border border-[#d8dbe1] bg-white px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-[#1f2734]">{request.spaceName}</p><span className="text-xs text-[#6e7788]">{statusLabel(request.status)}</span></div>
                      <p className="mt-1 text-xs text-[#6e7788]">Created: {formatDateTime(request.createdAt)}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </section>

          <section ref={controlsPanelRef} className="space-y-4">
            <section className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#1f2734]">My spaces</h2>
                {selectedSpace ? <span className="inline-flex items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]"><ShieldCheckIcon className="size-3.5" />{selectedSpace.actorRole}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">{memberSpaces.map((space) => (<button key={space.id} type="button" onClick={() => handleOpenControls(space.id)} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition", selectedSpace?.id === space.id ? "border-[#9bb0d7] bg-[#eef3fb] text-[#2f466d]" : "border-[#d8dbe1] bg-[#f8f9fc] text-[#5f6a7b] hover:bg-white")}><UsersIcon className="size-3.5" />{space.name}</button>))}</div>
            </section>

            {selectedSpace ? (
              <>
                <section className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-[#1f2734]">Space settings</h3>
                  {canManageSpace ? (
                    <form key={`space-settings-${selectedSpace.id}`} onSubmit={handleUpdateSpaceSubmit} className="mt-3 grid gap-2">
                      <input name="name" defaultValue={selectedSpace.name} placeholder="Space name" className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]" />
                      <input name="slug" defaultValue={selectedSpace.slug ?? ""} placeholder="Slug (optional)" className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]" />
                      <textarea name="description" defaultValue={selectedSpace.description ?? ""} placeholder="Description" className="min-h-[72px] rounded-lg border border-[#cfd5df] bg-white px-2.5 py-2 text-sm text-[#1f2734]" />
                      <div className="grid gap-2 md:grid-cols-3">
                        <select name="visibility" defaultValue={selectedSpace.visibility} disabled={selectedSpace.type === "personal"} className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734] disabled:opacity-60"><option value="hidden">Hidden space</option><option value="public">Public space</option></select>
                        <select name="joinPolicy" defaultValue={selectedSpace.joinPolicy} disabled={selectedSpace.type === "personal"} className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734] disabled:opacity-60"><option value="invite_only">Join: invite only</option><option value="request">Join: request</option></select>
                        <select name="reviewPolicy" defaultValue={selectedSpace.reviewPolicy} className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]"><option value="none">Review: none</option><option value="required">Review: required</option></select>
                      </div>
                      <div className="flex justify-end"><Button type="submit" variant="secondary" size="sm" disabled={updateSpaceMutation.isPending}>{updateSpaceMutation.isPending ? "Saving..." : "Save settings"}</Button></div>
                    </form>
                  ) : <p className="mt-2 text-sm text-[#6e7788]">No settings management privileges.</p>}
                </section>

                <section className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-[#1f2734]">Join requests moderation</h3>
                  {canManageMembers ? (
                    <div className="mt-3 space-y-2">
                      {pendingJoinRequests.slice(0, 8).map((request) => (
                        <article key={request.id} className="rounded-lg border border-[#d8dbe1] bg-white px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div><p className="text-sm font-medium text-[#1f2734]">{request.user.displayName || request.user.email || request.user.id}</p><p className="text-xs text-[#6e7788]">Requested: {formatDateTime(request.createdAt)}</p></div>
                            <div className="flex items-center gap-1.5">
                              <Button variant="secondary" size="xs" disabled={reviewJoinRequestMutation.isPending} onClick={() => reviewJoinRequestMutation.mutate({ spaceId: selectedSpace.id, data: { requestId: request.id, decision: "approve" } })}>Approve</Button>
                              <Button variant="outline" size="xs" disabled={reviewJoinRequestMutation.isPending} onClick={() => reviewJoinRequestMutation.mutate({ spaceId: selectedSpace.id, data: { requestId: request.id, decision: "reject" } })}>Reject</Button>
                            </div>
                          </div>
                        </article>
                      ))}
                      {pendingJoinRequests.length === 0 ? <p className="text-sm text-[#6e7788]">No pending requests.</p> : null}
                    </div>
                  ) : <p className="mt-2 text-sm text-[#6e7788]">No moderation privileges.</p>}
                </section>

                <section className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-[#1f2734]">Invites</h3>
                  {canManageInvites ? (
                    <>
                      <form onSubmit={handleInviteSubmit} className="mt-3 grid gap-2 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3">
                        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_130px_auto]">
                          <input type="email" value={inviteTargetEmail} onChange={(event) => setInviteTargetEmail(event.target.value)} placeholder="member@example.com" className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]" />
                          <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Extract<SpaceMemberRole, "admin" | "editor" | "member">)} className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]"><option value="member">member</option><option value="editor">editor</option><option value="admin">admin</option></select>
                          <select value={inviteExpiresHours} onChange={(event) => setInviteExpiresHours(event.target.value)} className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2.5 text-sm text-[#1f2734]"><option value="24">24h</option><option value="72">72h</option><option value="168">7d</option><option value="720">30d</option></select>
                          <Button type="submit" variant="secondary" size="sm" disabled={createInviteMutation.isPending}><MailPlusIcon data-icon="inline-start" />Invite</Button>
                        </div>
                      </form>
                      <div className="mt-3 space-y-2">
                        {recentInvites.slice(0, 10).map((invite) => (
                          <article key={invite.id} className="rounded-lg border border-[#d8dbe1] bg-white px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div><p className="text-sm font-medium text-[#1f2734]">{invite.targetEmail || invite.targetUserId || "direct invite"}</p><p className="text-xs text-[#6e7788]">{invite.role} / expires {formatDateTime(invite.expiresAt)} / {inviteStatusLabel(invite.status)}</p></div>
                              <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="xs" onClick={() => handleCopyInvite(invite.id, invite.webInviteUrl)}><CopyIcon data-icon="inline-start" />{copiedInviteId === invite.id ? "Copied" : "Copy link"}</Button>
                                {invite.status === "pending" ? <Button variant="outline" size="xs" disabled={revokeInviteMutation.isPending} onClick={() => revokeInviteMutation.mutate({ spaceId: selectedSpace.id, data: { inviteId: invite.id } })}><XIcon data-icon="inline-start" />Revoke</Button> : null}
                              </div>
                            </div>
                          </article>
                        ))}
                        {recentInvites.length === 0 ? <p className="text-sm text-[#6e7788]">No invites created yet.</p> : null}
                      </div>
                    </>
                  ) : <p className="mt-2 text-sm text-[#6e7788]">No invite management privileges.</p>}
                </section>
              </>
            ) : (
              <section className="rounded-xl border border-dashed border-[#cfd5df] bg-white/70 p-6 text-center">
                <p className="text-base font-medium text-[#2b3446]">Select a member space</p>
                <p className="mt-1 text-sm text-[#6e7788]">Controls for policy, join requests, and invites will appear here.</p>
                {!isGuest ? <p className="mt-2 text-xs text-[#7a8394]">If you only see public spaces, request access or create a team space.</p> : <Link href="/auth/signin?callbackUrl=/dashboard/spaces" className="mt-3 inline-flex text-sm font-medium text-[#2f466d] hover:underline">Sign in to manage spaces</Link>}
              </section>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-[#d8dbe1] bg-white/75 px-3 py-2 text-xs text-[#6e7788]"><span className="inline-flex items-center gap-1.5"><CircleHelpIcon className="size-3.5" />Invite links can be accepted at <code className="rounded bg-[#eef1f6] px-1">/space-invite/[token]</code>.</span></section>
      </div>
    </PortalPageShell>
  )
}
