"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  LockIcon,
  MailPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { PortalPageShell } from "@/components/portal-page-shell"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import { trpc } from "@/lib/trpc/react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TabId = "my" | "discover" | "manage"
type RequestStatus = "pending" | "approved" | "rejected" | "cancelled"
type InviteStatus = "pending" | "accepted" | "revoked" | "expired"
type SpaceMemberRole = "owner" | "admin" | "editor" | "member"
type ToastMessage = { id: number; text: string; type: "success" | "error" } | null

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusLabel(status: RequestStatus) {
  if (status === "pending") return "Pending"
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
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-violet-50 text-violet-700",
  admin: "bg-blue-50 text-blue-700",
  editor: "bg-emerald-50 text-emerald-700",
  member: "bg-gray-100 text-gray-600",
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-emerald-400",
  rejected: "bg-red-400",
  cancelled: "bg-gray-400",
  accepted: "bg-emerald-400",
  revoked: "bg-red-400",
  expired: "bg-gray-400",
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

function Toast({ message, onClose }: { message: NonNullable<ToastMessage>; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${message.type === "success" ? "bg-[#1f2734] text-white" : "bg-red-600 text-white"}`}>
        <span>{message.text}</span>
        <button type="button" onClick={onClose} className="ml-1 rounded p-0.5 transition hover:bg-white/20">
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Role badge                                                         */
/* ------------------------------------------------------------------ */

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${colors}`}>
      <ShieldCheckIcon className="size-3" />
      {role}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Space Dialog                                                */
/* ------------------------------------------------------------------ */

function CreateSpaceDialog({
  isPending,
  onSubmit,
  onCancel,
}: {
  isPending: boolean
  onSubmit: (data: {
    name: string
    slug?: string
    description?: string | null
    visibility: "public" | "hidden"
    joinPolicy: "request" | "invite_only"
    reviewPolicy: "none" | "required"
  }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"public" | "hidden">("hidden")
  const [joinPolicy, setJoinPolicy] = useState<"request" | "invite_only">("invite_only")
  const [reviewPolicy, setReviewPolicy] = useState<"none" | "required">("none")

  const invalidSlug = slug.trim().length > 0 && !isValidSlug(slug.trim())

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || isPending) return
    onSubmit({
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || null,
      visibility,
      joinPolicy,
      reviewPolicy,
    })
  }

  const inputCls = "h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#1f2734] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
  const selectCls = "h-9 rounded-lg border border-[#e5e7eb] bg-white px-2.5 text-sm text-[#374151] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <UsersIcon className="size-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1f2734]">Create team space</h3>
            <p className="text-[13px] text-[#9ca3af]">A shared workspace for bridge content</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b7280]">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My team space" className={inputCls} autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b7280]">Slug <span className="text-[#9ca3af]">(optional)</span></label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-team-space" className={`${inputCls} ${invalidSlug ? "!border-red-300 !ring-red-200" : ""}`} />
            {invalidSlug ? <p className="mt-1 text-xs text-red-500">Use lowercase letters, numbers, and hyphens</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b7280]">Description <span className="text-[#9ca3af]">(optional)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this space about?" rows={2} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2734] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6b7280]">Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "hidden")} className={`w-full ${selectCls}`}>
                <option value="hidden">Hidden</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6b7280]">Join policy</label>
              <select value={joinPolicy} onChange={(e) => setJoinPolicy(e.target.value as "request" | "invite_only")} className={`w-full ${selectCls}`}>
                <option value="invite_only">Invite only</option>
                <option value="request">Request</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6b7280]">Review</label>
              <select value={reviewPolicy} onChange={(e) => setReviewPolicy(e.target.value as "none" | "required")} className={`w-full ${selectCls}`}>
                <option value="none">None</option>
                <option value="required">Required</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} disabled={isPending} className="h-9 rounded-lg border border-[#e5e7eb] px-3.5 text-sm font-medium text-[#374151] transition hover:bg-[#f3f4f6] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending || !name.trim() || invalidSlug} className="h-9 rounded-lg bg-[#1f2734] px-3.5 text-sm font-medium text-white transition hover:bg-[#374151] disabled:opacity-60">
              {isPending ? "Creating..." : "Create space"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Discover row action menu                                           */
/* ------------------------------------------------------------------ */

function DiscoverRowMenu({
  space,
  isGuest,
  requestStatus,
  onRequestJoin,
  onManage,
}: {
  space: { id: string; actorRole: string; joinPolicy: string }
  isGuest: boolean
  requestStatus: RequestStatus | null
  onRequestJoin: (spaceId: string) => void
  onManage: (spaceId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) setOpen(false)
  }, [])

  const isMember = space.actorRole !== "guest"
  const canRequest = !isMember && space.joinPolicy === "request" && !isGuest && requestStatus !== "pending"

  return (
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button type="button" onClick={() => setOpen((p) => !p)} className="inline-flex size-7 items-center justify-center rounded-md text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#6b7280]" aria-label="Actions">
        <MoreHorizontalIcon className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {isMember ? (
            <button type="button" onClick={() => { setOpen(false); onManage(space.id) }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#374151] hover:bg-[#f3f4f6]">
              <SettingsIcon className="size-3.5 text-[#9ca3af]" />
              Manage space
            </button>
          ) : null}
          {canRequest ? (
            <button type="button" onClick={() => { setOpen(false); onRequestJoin(space.id) }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#374151] hover:bg-[#f3f4f6]">
              <UsersIcon className="size-3.5 text-[#9ca3af]" />
              Request join
            </button>
          ) : null}
          {!isMember && space.joinPolicy === "invite_only" ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#9ca3af]">
              <LockIcon className="size-3.5" />
              Invite only
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

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

  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState<TabId>("my")
  const [query, setQuery] = useState("")
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const [inviteRole, setInviteRole] = useState<Extract<SpaceMemberRole, "admin" | "editor" | "member">>("member")
  const [inviteTargetEmail, setInviteTargetEmail] = useState("")
  const [inviteExpiresHours, setInviteExpiresHours] = useState("72")

  const utils = trpc.useUtils()

  /* ---- Queries ---- */
  const spacesQuery = trpc.spaces.list.useQuery(query.trim() ? { query: query.trim() } : undefined, { staleTime: 20_000 })
  const myRequestsQuery = trpc.spaces.joinRequests.mine.useQuery(undefined, { enabled: !isGuest, staleTime: 20_000 })

  const spaces = useMemo(() => spacesQuery.data?.spaces ?? [], [spacesQuery.data?.spaces])
  const memberSpaces = useMemo(() => spaces.filter((s) => s.actorRole !== "guest"), [spaces])

  const activeSelectedSpaceId = useMemo(() => {
    if (incomingSpaceId && memberSpaces.some((s) => s.id === incomingSpaceId)) return incomingSpaceId
    if (selectedSpaceId && memberSpaces.some((s) => s.id === selectedSpaceId)) return selectedSpaceId
    return memberSpaces[0]?.id ?? null
  }, [incomingSpaceId, memberSpaces, selectedSpaceId])

  const selectedSpace = useMemo(() => memberSpaces.find((s) => s.id === activeSelectedSpaceId) ?? null, [activeSelectedSpaceId, memberSpaces])
  const canManageSpace = !!selectedSpace?.capabilities.includes("space.manage")
  const canManageMembers = !!selectedSpace?.capabilities.includes("space.members.manage")
  const canManageInvites = !!selectedSpace?.capabilities.includes("space.invites.manage")

  const requestBySpace = useMemo(() => {
    const map = new Map<string, { id: string; status: RequestStatus }>()
    for (const r of myRequestsQuery.data?.requests ?? []) {
      if (!map.has(r.spaceId)) map.set(r.spaceId, { id: r.id, status: r.status })
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

  const pendingJoinRequests = (joinRequestsQuery.data?.requests ?? []).filter((r) => r.status === "pending")
  const recentInvites = invitesQuery.data?.invites ?? []

  /* ---- Toast ---- */
  const showToast = useCallback((text: string, type: "success" | "error") => {
    const id = Date.now()
    setToast({ id, text, type })
    setTimeout(() => setToast((prev) => (prev?.id === id ? null : prev)), 3500)
  }, [])

  /* ---- Mutations ---- */
  const requestMutation = trpc.spaces.joinRequests.create.useMutation({
    onSuccess: async () => {
      showToast("Join request sent", "success")
      await Promise.all([spacesQuery.refetch(), myRequestsQuery.refetch()])
    },
    onError: (err) => showToast(err.message || "Failed to send request", "error"),
  })

  const createSpaceMutation = trpc.spaces.create.useMutation({
    onSuccess: async (result) => {
      showToast("Space created", "success")
      setShowCreateDialog(false)
      setSelectedSpaceId(result.space.id)
      setActiveTab("manage")
      await spacesQuery.refetch()
    },
    onError: (err) => showToast(err.message || "Failed to create space", "error"),
  })

  const updateSpaceMutation = trpc.spaces.update.useMutation({
    onSuccess: async () => {
      showToast("Settings saved", "success")
      await spacesQuery.refetch()
    },
    onError: (err) => showToast(err.message || "Failed to update", "error"),
  })

  const reviewJoinRequestMutation = trpc.spaces.joinRequests.review.useMutation({
    onSuccess: async () => {
      showToast("Request updated", "success")
      await Promise.all([joinRequestsQuery.refetch(), spacesQuery.refetch(), myRequestsQuery.refetch()])
    },
    onError: (err) => showToast(err.message || "Failed to review", "error"),
  })

  const createInviteMutation = trpc.spaces.invites.create.useMutation({
    onSuccess: async () => {
      showToast("Invite created", "success")
      setInviteTargetEmail("")
      setInviteRole("member")
      setInviteExpiresHours("72")
      await invitesQuery.refetch()
    },
    onError: (err) => showToast(err.message || "Failed to create invite", "error"),
  })

  const revokeInviteMutation = trpc.spaces.invites.revoke.useMutation({
    onSuccess: async () => {
      showToast("Invite revoked", "success")
      await invitesQuery.refetch()
    },
    onError: (err) => showToast(err.message || "Failed to revoke", "error"),
  })

  /* ---- Handlers ---- */
  async function handleCopyInvite(inviteId: string, inviteUrl: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedInviteId(inviteId)
      showToast("Invite link copied", "success")
      setTimeout(() => setCopiedInviteId((cur) => (cur === inviteId ? null : cur)), 1500)
    } catch {
      showToast("Failed to copy link", "error")
    }
  }

  function handleUpdateSpaceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSpace || !canManageSpace || updateSpaceMutation.isPending) return
    const fd = new FormData(event.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    const slug = String(fd.get("slug") ?? "").trim()
    const description = String(fd.get("description") ?? "").trim()
    const visibility = String(fd.get("visibility") ?? selectedSpace.visibility) as "public" | "hidden"
    const joinPolicy = String(fd.get("joinPolicy") ?? selectedSpace.joinPolicy) as "request" | "invite_only"
    const reviewPolicy = String(fd.get("reviewPolicy") ?? selectedSpace.reviewPolicy) as "none" | "required"
    if (!name) return showToast("Space name is required", "error")
    if (slug && !isValidSlug(slug)) return showToast("Invalid slug format", "error")

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
    if (!inviteTargetEmail.trim()) return showToast("Email is required", "error")

    createInviteMutation.mutate({
      spaceId: selectedSpace.id,
      data: {
        role: inviteRole,
        targetEmail: inviteTargetEmail.trim(),
        expiresInHours: Number(inviteExpiresHours),
      },
    })
  }

  function handleManageSpace(spaceId: string) {
    setSelectedSpaceId(spaceId)
    setActiveTab("manage")
  }

  /* ---- Tab helpers ---- */
  const inputCls = "h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#1f2734] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
  const selectCls = "h-9 rounded-lg border border-[#e5e7eb] bg-white px-2.5 text-sm text-[#374151] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"

  function tabCls(id: TabId) {
    return `px-1 pb-2.5 text-sm font-medium transition ${activeTab === id ? "border-b-2 border-[#1f2734] text-[#1f2734]" : "text-[#9ca3af] hover:text-[#6b7280]"}`
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
      <div className="w-full space-y-5 [[data-sidebar-state=collapsed]_&]:mx-auto [[data-sidebar-state=collapsed]_&]:max-w-5xl">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                <UsersIcon className="size-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#1f2734]">Spaces</h1>
                <p className="text-[13px] text-[#9ca3af]">Communities and workspaces for bridge content</p>
              </div>
            </div>
          </div>
          {!isGuest ? (
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="group inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f2734] px-3.5 text-sm font-medium text-white transition hover:bg-[#374151] hover:shadow-md"
            >
              <PlusIcon className="size-4 transition-transform group-hover:rotate-90" />
              Create space
            </button>
          ) : (
            <a href="/auth/signin?callbackUrl=/dashboard/spaces" className="text-sm font-medium text-[#2f466d] hover:underline">
              Sign in to create
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-[#e5e7eb]">
          <button type="button" onClick={() => setActiveTab("my")} className={tabCls("my")}>
            My Spaces
            {memberSpaces.length > 0 ? <span className="ml-1.5 text-[11px] text-[#9ca3af]">{memberSpaces.length}</span> : null}
          </button>
          <button type="button" onClick={() => setActiveTab("discover")} className={tabCls("discover")}>
            Discover
            {spaces.length > 0 ? <span className="ml-1.5 text-[11px] text-[#9ca3af]">{spaces.length}</span> : null}
          </button>
          {!isGuest && memberSpaces.length > 0 ? (
            <button type="button" onClick={() => setActiveTab("manage")} className={tabCls("manage")}>
              <SettingsIcon className="mr-1 inline size-3.5" />
              Manage
              {selectedSpace ? <span className="ml-1 text-[11px] text-[#9ca3af]">· {selectedSpace.name}</span> : null}
            </button>
          ) : null}
        </div>

        {/* ============ TAB: My Spaces ============ */}
        {activeTab === "my" ? (
          <div>
            {memberSpaces.length > 0 ? (
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {memberSpaces.map((space) => (
                  <div key={space.id} className="group relative rounded-xl border border-[#e5e7eb] bg-white transition-all hover:border-[#d1d5db] hover:shadow-md">
                    {/* Accent bar */}
                    <div className={`h-1 rounded-t-xl ${space.type === "personal" ? "bg-gradient-to-r from-gray-300 to-gray-400" : "bg-gradient-to-r from-blue-400 to-blue-600"}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-[#1f2734]">{space.name}</h3>
                          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#9ca3af]">{space.type}</p>
                        </div>
                        <RoleBadge role={space.actorRole} />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-[#6b7280]">{space.description || "No description"}</p>
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[11px] text-[#9ca3af]">
                          {space.visibility === "public" ? <GlobeIcon className="size-3" /> : <LockIcon className="size-3" />}
                          {space.visibility}
                        </span>
                        <span className="rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[11px] text-[#9ca3af]">
                          {space.joinPolicy === "invite_only" ? "invite only" : "request"}
                        </span>
                      </div>
                      <div className="mt-3 border-t border-[#f3f4f6] pt-3">
                        <button
                          type="button"
                          onClick={() => handleManageSpace(space.id)}
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-[#f3f4f6] px-2.5 text-xs font-medium text-[#374151] transition hover:bg-[#e5e7eb]"
                        >
                          <SettingsIcon className="size-3" />
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ) : (
              <div className="py-16 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb]">
                  <UsersIcon className="size-7 text-[#9ca3af]" />
                </div>
                <p className="mt-4 text-base font-medium text-[#374151]">No spaces yet</p>
                <p className="mt-1 text-sm text-[#9ca3af]">
                  {isGuest ? "Sign in to join or create spaces." : "Create a space or discover existing ones."}
                </p>
                {!isGuest ? (
                  <button type="button" onClick={() => setShowCreateDialog(true)} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f2734] px-4 text-sm font-medium text-white transition hover:bg-[#374151]">
                    <PlusIcon className="size-4" />
                    Create first space
                  </button>
                ) : null}
              </div>
            )}

            {/* My join requests */}
            {!isGuest && (myRequestsQuery.data?.requests ?? []).length > 0 ? (
              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#6b7280]">My join requests</h3>
                <div className="mt-3 border-t border-[#e5e7eb]">
                  {(myRequestsQuery.data?.requests ?? []).slice(0, 6).map((req) => (
                    <div key={req.id} className="flex items-center justify-between border-b border-[#f0f0f0] py-2.5">
                      <div>
                        <p className="text-sm font-medium text-[#1f2734]">{req.spaceName}</p>
                        <p className="text-xs text-[#9ca3af]">{formatDateTime(req.createdAt)}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6b7280]">
                        <span className={`size-1.5 rounded-full ${STATUS_DOT[req.status] ?? "bg-gray-400"}`} />
                        {statusLabel(req.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ============ TAB: Discover ============ */}
        {activeTab === "discover" ? (
          <div>
            {/* Search */}
            <label className="relative block max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search spaces..."
                className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white pl-8 pr-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
              />
            </label>

            {/* Table */}
            <div className="mt-4 border-t border-[#e5e7eb]">
              <div className="hidden border-b border-[#e5e7eb] px-1 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9ca3af] md:grid md:grid-cols-[minmax(0,3fr)_80px_90px_100px_80px_44px]">
                <span>Name</span>
                <span>Type</span>
                <span>Visibility</span>
                <span>Join policy</span>
                <span>Your role</span>
                <span />
              </div>
              {spaces.map((space) => {
                const req = requestBySpace.get(space.id)
                return (
                  <div key={space.id} className="group border-b border-[#f0f0f0] px-1 py-3 transition-colors hover:bg-[#fafbfc] md:grid md:grid-cols-[minmax(0,3fr)_80px_90px_100px_80px_44px] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1f2734]">{space.name}</p>
                      {space.description ? <p className="mt-0.5 truncate text-xs text-[#9ca3af]">{space.description}</p> : null}
                    </div>
                    <div className="hidden text-xs text-[#9ca3af] md:block">{space.type}</div>
                    <div className="hidden md:block">
                      <span className="inline-flex items-center gap-1 text-xs text-[#9ca3af]">
                        {space.visibility === "public" ? <GlobeIcon className="size-3" /> : <LockIcon className="size-3" />}
                        {space.visibility}
                      </span>
                    </div>
                    <div className="hidden text-xs text-[#9ca3af] md:block">
                      {space.joinPolicy === "invite_only" ? "invite only" : "request"}
                    </div>
                    <div className="mt-1 md:mt-0">
                      {space.actorRole !== "guest" ? (
                        <RoleBadge role={space.actorRole} />
                      ) : req ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6b7280]">
                          <span className={`size-1.5 rounded-full ${STATUS_DOT[req.status] ?? "bg-gray-400"}`} />
                          {statusLabel(req.status)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#b0b7c3]">guest</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-end md:mt-0">
                      <DiscoverRowMenu
                        space={space}
                        isGuest={isGuest}
                        requestStatus={req?.status ?? null}
                        onRequestJoin={(id) => requestMutation.mutate({ spaceId: id, data: {} })}
                        onManage={handleManageSpace}
                      />
                    </div>
                  </div>
                )
              })}
              {spaces.length === 0 && !spacesQuery.isLoading ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-[#9ca3af]">No spaces found</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ============ TAB: Manage ============ */}
        {activeTab === "manage" ? (
          <div>
            {/* Space switcher */}
            {memberSpaces.length > 1 ? (
              <div className="mb-5 flex flex-wrap gap-1.5">
                {memberSpaces.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSpaceId(s.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${activeSelectedSpaceId === s.id ? "border-[#1f2734] bg-[#1f2734] text-white" : "border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6]"}`}
                  >
                    <UsersIcon className="size-3" />
                    {s.name}
                  </button>
                ))}
              </div>
            ) : null}

            {selectedSpace ? (
              <div className="space-y-8">
                {/* ---- Settings ---- */}
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Settings</h3>
                  {canManageSpace ? (
                    <form key={`settings-${selectedSpace.id}`} onSubmit={handleUpdateSpaceSubmit} className="mt-4 space-y-3 max-w-xl">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#6b7280]">Name</label>
                        <input name="name" defaultValue={selectedSpace.name} className={inputCls} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#6b7280]">Slug</label>
                        <input name="slug" defaultValue={selectedSpace.slug ?? ""} placeholder="optional" className={inputCls} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#6b7280]">Description</label>
                        <textarea name="description" defaultValue={selectedSpace.description ?? ""} rows={2} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2734] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#6b7280]">Visibility</label>
                          <select name="visibility" defaultValue={selectedSpace.visibility} disabled={selectedSpace.type === "personal"} className={`w-full ${selectCls} disabled:opacity-50`}>
                            <option value="hidden">Hidden</option>
                            <option value="public">Public</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#6b7280]">Join policy</label>
                          <select name="joinPolicy" defaultValue={selectedSpace.joinPolicy} disabled={selectedSpace.type === "personal"} className={`w-full ${selectCls} disabled:opacity-50`}>
                            <option value="invite_only">Invite only</option>
                            <option value="request">Request</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#6b7280]">Review</label>
                          <select name="reviewPolicy" defaultValue={selectedSpace.reviewPolicy} className={`w-full ${selectCls}`}>
                            <option value="none">None</option>
                            <option value="required">Required</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" disabled={updateSpaceMutation.isPending} className="h-9 rounded-lg bg-[#1f2734] px-3.5 text-sm font-medium text-white transition hover:bg-[#374151] disabled:opacity-60">
                          {updateSpaceMutation.isPending ? "Saving..." : "Save settings"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-3 text-sm text-[#9ca3af]">You don&apos;t have permission to manage settings.</p>
                  )}
                </section>

                {/* ---- Join Requests ---- */}
                <section className="border-t border-[#e5e7eb] pt-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Join requests</h3>
                    {pendingJoinRequests.length > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {pendingJoinRequests.length} pending
                      </span>
                    ) : null}
                  </div>
                  {canManageMembers ? (
                    <div className="mt-3">
                      {pendingJoinRequests.length > 0 ? (
                        <div className="border-t border-[#e5e7eb]">
                          {pendingJoinRequests.slice(0, 8).map((req) => (
                            <div key={req.id} className="flex items-center justify-between border-b border-[#f0f0f0] py-3">
                              <div>
                                <p className="text-sm font-medium text-[#1f2734]">{req.user.displayName || req.user.email || req.user.id}</p>
                                <p className="text-xs text-[#9ca3af]">Requested {formatDateTime(req.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={reviewJoinRequestMutation.isPending}
                                  onClick={() => reviewJoinRequestMutation.mutate({ spaceId: selectedSpace.id, data: { requestId: req.id, decision: "approve" } })}
                                  className="inline-flex size-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
                                  title="Approve"
                                >
                                  <CheckIcon className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewJoinRequestMutation.isPending}
                                  onClick={() => reviewJoinRequestMutation.mutate({ spaceId: selectedSpace.id, data: { requestId: req.id, decision: "reject" } })}
                                  className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                                  title="Reject"
                                >
                                  <XIcon className="size-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#9ca3af]">No pending requests</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#9ca3af]">You don&apos;t have moderation permissions.</p>
                  )}
                </section>

                {/* ---- Invites ---- */}
                <section className="border-t border-[#e5e7eb] pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Invites</h3>
                  {canManageInvites ? (
                    <div className="mt-3 space-y-4">
                      <form onSubmit={handleInviteSubmit} className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px] flex-1">
                          <label className="mb-1 block text-xs font-medium text-[#6b7280]">Email</label>
                          <input type="email" value={inviteTargetEmail} onChange={(e) => setInviteTargetEmail(e.target.value)} placeholder="member@example.com" className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#6b7280]">Role</label>
                          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Extract<SpaceMemberRole, "admin" | "editor" | "member">)} className={selectCls}>
                            <option value="member">member</option>
                            <option value="editor">editor</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#6b7280]">Expires</label>
                          <select value={inviteExpiresHours} onChange={(e) => setInviteExpiresHours(e.target.value)} className={selectCls}>
                            <option value="24">24h</option>
                            <option value="72">72h</option>
                            <option value="168">7 days</option>
                            <option value="720">30 days</option>
                          </select>
                        </div>
                        <button type="submit" disabled={createInviteMutation.isPending} className="h-9 rounded-lg bg-[#1f2734] px-3.5 text-sm font-medium text-white transition hover:bg-[#374151] disabled:opacity-60">
                          <MailPlusIcon className="mr-1.5 inline size-3.5" />
                          {createInviteMutation.isPending ? "Sending..." : "Invite"}
                        </button>
                      </form>

                      {recentInvites.length > 0 ? (
                        <div className="border-t border-[#e5e7eb]">
                          {recentInvites.slice(0, 10).map((invite) => (
                            <div key={invite.id} className="flex items-center justify-between border-b border-[#f0f0f0] py-2.5">
                              <div>
                                <p className="text-sm font-medium text-[#1f2734]">{invite.targetEmail || invite.targetUserId || "Direct invite"}</p>
                                <p className="flex items-center gap-2 text-xs text-[#9ca3af]">
                                  <span>{invite.role}</span>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <span className={`size-1.5 rounded-full ${STATUS_DOT[invite.status] ?? "bg-gray-400"}`} />
                                    {inviteStatusLabel(invite.status)}
                                  </span>
                                  <span>·</span>
                                  <span>expires {formatDateTime(invite.expiresAt)}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyInvite(invite.id, invite.webInviteUrl)}
                                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[#e5e7eb] px-2 text-xs text-[#374151] transition hover:bg-[#f3f4f6]"
                                >
                                  <CopyIcon className="size-3" />
                                  {copiedInviteId === invite.id ? "Copied!" : "Copy"}
                                </button>
                                {invite.status === "pending" ? (
                                  <button
                                    type="button"
                                    disabled={revokeInviteMutation.isPending}
                                    onClick={() => revokeInviteMutation.mutate({ spaceId: selectedSpace.id, data: { inviteId: invite.id } })}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 px-2 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <XIcon className="size-3" />
                                    Revoke
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#9ca3af]">No invites created yet</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#9ca3af]">You don&apos;t have invite permissions.</p>
                  )}
                </section>
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb]">
                  <SettingsIcon className="size-7 text-[#9ca3af]" />
                </div>
                <p className="mt-4 text-base font-medium text-[#374151]">Select a space to manage</p>
                <p className="mt-1 text-sm text-[#9ca3af]">Choose from your spaces above, or switch to My Spaces tab.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Create space dialog */}
      {showCreateDialog ? (
        <CreateSpaceDialog
          isPending={createSpaceMutation.isPending}
          onSubmit={(data) => {
            createSpaceMutation.mutate({
              name: data.name,
              description: data.description ?? null,
              slug: data.slug,
              type: "team",
              visibility: data.visibility,
              joinPolicy: data.joinPolicy,
              reviewPolicy: data.reviewPolicy,
            })
          }}
          onCancel={() => setShowCreateDialog(false)}
        />
      ) : null}

      {/* Toast */}
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </PortalPageShell>
  )
}
