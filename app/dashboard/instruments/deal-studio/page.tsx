"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  ArchiveIcon,
  CheckIcon,
  ChevronDownIcon,
  FlaskConicalIcon,
  LayoutGridIcon,
  LayoutListIcon,
  MoreHorizontalIcon,
  PencilLineIcon,
  RotateCcwIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { PortalPageShell } from "@/components/portal-page-shell"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import { trpc } from "@/lib/trpc/react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ViewMode = "list" | "grid"
type StatusFilter = "all" | "draft" | "published" | "archived"
type ArchiveTarget = { id: string; title: string } | null
type DeleteTarget = { id: string; title: string } | null
type ToastMessage = { id: number; text: string; type: "success" | "error" } | null

/* ------------------------------------------------------------------ */
/*  Suit decoration — renders a tiny suit symbol next to deal title    */
/* ------------------------------------------------------------------ */

const SUITS = ["♠", "♥", "♦", "♣"] as const
const SUIT_COLORS = ["text-[#1f2734]", "text-red-500", "text-orange-500", "text-emerald-600"] as const

function DealSuitBadge({ id }: { id: string }) {
  const index = Math.abs(hashCode(id)) % 4
  return (
    <span className={`text-sm leading-none ${SUIT_COLORS[index]}`} aria-hidden>
      {SUITS[index]}
    </span>
  )
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h
}

/* ------------------------------------------------------------------ */
/*  Filter chip dropdown                                               */
/* ------------------------------------------------------------------ */

function FilterChip<T extends string>({
  value,
  onChange,
  options,
  allLabel,
  allValue,
  multi = false,
}: {
  value: T | T[]
  onChange: (v: T | T[]) => void
  options: { value: T; label: string }[]
  allLabel: string
  allValue: T
  multi?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isActive = multi
    ? (value as T[]).length > 0 && !(value as T[]).includes(allValue)
    : value !== allValue

  const activeLabel = multi
    ? (() => {
        const vals = value as T[]
        if (vals.length === 0 || vals.includes(allValue)) return allLabel
        if (vals.length === 1) return options.find((o) => o.value === vals[0])?.label ?? allLabel
        return `${options.find((o) => o.value === vals[0])?.label ?? vals[0]} +${vals.length - 1}`
      })()
    : options.find((o) => o.value === (value as T))?.label ?? allLabel

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) setOpen(false)
  }, [])

  const handleSelect = useCallback((optValue: T) => {
    if (!multi) {
      ;(onChange as (v: T) => void)(optValue)
      setOpen(false)
      return
    }
    const current = (value as T[]).filter((v) => v !== allValue)
    if (optValue === allValue) {
      ;(onChange as (v: T[]) => void)([allValue])
      setOpen(false)
      return
    }
    const next = current.includes(optValue)
      ? current.filter((v) => v !== optValue)
      : [...current, optValue]
    ;(onChange as (v: T[]) => void)(next.length === 0 ? [allValue] : next)
  }, [multi, value, allValue, onChange])

  const isChecked = useCallback((optValue: T) => {
    if (multi) {
      if (optValue === allValue) {
        const vals = value as T[]
        return vals.length === 0 || vals.includes(allValue)
      }
      return (value as T[]).includes(optValue)
    }
    return value === optValue
  }, [multi, value, allValue])

  return (
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition hover:border-[#d1d5db] hover:bg-[#f3f4f6] hover:text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20 ${
          isActive
            ? "border-[#1f2734]/20 bg-[#1f2734]/5 text-[#1f2734]"
            : "border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280]"
        }`}
      >
        <span>{activeLabel}</span>
        {multi && isActive ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-[#1f2734] text-[10px] font-bold text-white">{(value as T[]).filter((v) => v !== allValue).length}</span>
        ) : null}
        <ChevronDownIcon className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const checked = isChecked(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[13px] transition ${
                  checked
                    ? "bg-[#f3f4f6] font-medium text-[#1f2734]"
                    : "text-[#374151] hover:bg-[#fafbfc]"
                }`}
              >
                <span>{opt.label}</span>
                {checked ? <CheckIcon className="size-3.5 text-[#1f2734]" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  draft: { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  published: { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  archived: { bg: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.archived!
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Toast notification                                                 */
/* ------------------------------------------------------------------ */

function Toast({ message, onClose }: { message: NonNullable<ToastMessage>; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
          message.type === "success"
            ? "bg-[#1f2734] text-white"
            : "bg-red-600 text-white"
        }`}
      >
        <span>{message.text}</span>
        <button type="button" onClick={onClose} className="ml-1 rounded p-0.5 hover:bg-white/20 transition">
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Archive confirmation dialog                                        */
/* ------------------------------------------------------------------ */

function ArchiveDialog({
  target,
  isPending,
  onConfirm,
  onCancel,
}: {
  target: NonNullable<ArchiveTarget>
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />
      {/* panel */}
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <ArchiveIcon className="size-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#1f2734]">Archive deal analysis</h3>
            <p className="mt-1.5 text-sm text-[#6b7280]">
              Are you sure you want to archive{" "}
              <span className="font-medium text-[#374151]">&ldquo;{target.title}&rdquo;</span>?
              It will be moved to the archived section and can be restored later.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-9 rounded-lg border border-[#e5e7eb] px-3.5 text-sm font-medium text-[#374151] transition hover:bg-[#f3f4f6] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="h-9 rounded-lg bg-amber-600 px-3.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {isPending ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation dialog                                         */
/* ------------------------------------------------------------------ */

function DeleteDialog({
  target,
  isPending,
  onConfirm,
  onCancel,
}: {
  target: NonNullable<DeleteTarget>
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50">
            <Trash2Icon className="size-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#1f2734]">Delete permanently</h3>
            <p className="mt-1.5 text-sm text-[#6b7280]">
              Are you sure you want to permanently delete{" "}
              <span className="font-medium text-[#374151]">&ldquo;{target.title}&rdquo;</span>?
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isPending} className="h-9 rounded-lg border border-[#e5e7eb] px-3.5 text-sm font-medium text-[#374151] transition hover:bg-[#f3f4f6] disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="h-9 rounded-lg bg-red-600 px-3.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60">
            {isPending ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Row action menu (three-dot)                                        */
/* ------------------------------------------------------------------ */

function RowActionMenu({
  item,
  isGuest,
  isAuthor,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  item: { id: string; title: string; status: string }
  isGuest: boolean
  isAuthor: boolean
  onArchive: (target: NonNullable<ArchiveTarget>) => void
  onUnarchive: (id: string) => void
  onDelete: (target: NonNullable<DeleteTarget>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }, [])

  return (
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex size-7 items-center justify-center rounded-md text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#6b7280]"
        aria-label="Actions"
      >
        <MoreHorizontalIcon className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-lg border border-[#e5e7eb] bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <Link
            href={`/dashboard/content/${encodeURIComponent(item.id)}/study`}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#374151] hover:bg-[#f3f4f6]"
            onClick={close}
          >
            <FlaskConicalIcon className="size-3.5 text-[#9ca3af]" />
            Studio
          </Link>
          <Link
            href={`/dashboard/content/${encodeURIComponent(item.id)}`}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#374151] hover:bg-[#f3f4f6]"
            onClick={close}
          >
            <SparklesIcon className="size-3.5 text-[#9ca3af]" />
            Open
          </Link>
          {!isGuest ? (
            <Link
              href={`/dashboard/content/${encodeURIComponent(item.id)}/edit`}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#374151] hover:bg-[#f3f4f6]"
              onClick={close}
            >
              <PencilLineIcon className="size-3.5 text-[#9ca3af]" />
              Edit
            </Link>
          ) : null}
          {!isGuest ? (
            <>
              <div className="my-1 border-t border-[#f0f0f0]" />
              {item.status === "archived" ? (
                <button type="button" onClick={() => { close(); onUnarchive(item.id) }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#374151] hover:bg-[#f3f4f6]">
                  <RotateCcwIcon className="size-3.5 text-[#9ca3af]" />
                  Restore to draft
                </button>
              ) : (
                <button type="button" onClick={() => { close(); onArchive({ id: item.id, title: item.title }) }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-amber-600 hover:bg-amber-50">
                  <ArchiveIcon className="size-3.5" />
                  Archive
                </button>
              )}
              {isAuthor ? (
                <button type="button" onClick={() => { close(); onDelete({ id: item.id, title: item.title }) }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50">
                  <Trash2Icon className="size-3.5" />
                  Delete permanently
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function DealStudioListPage() {
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [toast, setToast] = useState<ToastMessage>(null)

  const utils = trpc.useUtils()

  const listInput = useMemo(() => ({
    query: query.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    format: "deal_analysis" as const,
    limit: 80,
  }), [query, statusFilter])

  const contentQuery = trpc.content.list.useQuery(listInput, { staleTime: 5_000 })
  const items = contentQuery.data?.items ?? []

  const archiveMutation = trpc.content.archive.useMutation({
    onSuccess: () => {
      utils.content.list.invalidate()
      setArchiveTarget(null)
      showToast("Deal analysis archived", "success")
    },
    onError: (error) => {
      setArchiveTarget(null)
      showToast(error.message || "Failed to archive", "error")
    },
  })

  const unarchiveMutation = trpc.content.unarchive.useMutation({
    onSuccess: () => {
      utils.content.list.invalidate()
      showToast("Deal analysis restored to draft", "success")
    },
    onError: (error) => {
      showToast(error.message || "Failed to restore", "error")
    },
  })

  const hardDeleteMutation = trpc.content.hardDelete.useMutation({
    onSuccess: () => {
      utils.content.list.invalidate()
      setDeleteTarget(null)
      showToast("Deal analysis permanently deleted", "success")
    },
    onError: (error) => {
      setDeleteTarget(null)
      showToast(error.message || "Failed to delete", "error")
    },
  })

  const showToast = useCallback((text: string, type: "success" | "error") => {
    const id = Date.now()
    setToast({ id, text, type })
    setTimeout(() => setToast((prev) => (prev?.id === id ? null : prev)), 3500)
  }, [])

  const handleArchiveConfirm = useCallback(() => {
    if (!archiveTarget) return
    archiveMutation.mutate({ contentId: archiveTarget.id })
  }, [archiveTarget, archiveMutation])

  const handleUnarchive = useCallback((contentId: string) => {
    unarchiveMutation.mutate({ contentId })
  }, [unarchiveMutation])

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return
    hardDeleteMutation.mutate({ contentId: deleteTarget.id, data: { confirm: true } })
  }, [deleteTarget, hardDeleteMutation])

  const totalLabel = items.length === 1 ? "1 deal" : `${items.length} deals`

  const statusOptions = useMemo(() => [
    { value: "all" as StatusFilter, label: "All statuses" },
    { value: "draft" as StatusFilter, label: "Draft" },
    { value: "published" as StatusFilter, label: "Published" },
    { value: "archived" as StatusFilter, label: "Archived" },
  ], [])

  return (
    <PortalPageShell
      roles={roles}
      isGuest={isGuest}
      user={user}
      breadcrumbs={[
        { label: "Portal", href: "/dashboard" },
        { label: "Instruments" },
        { label: "Deal Studio" },
      ]}
    >
      <div className="w-full space-y-5 [[data-sidebar-state=collapsed]_&]:mx-auto [[data-sidebar-state=collapsed]_&]:max-w-5xl">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e5e7eb] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1f2734] to-[#374151]">
                <FlaskConicalIcon className="size-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#1f2734]">Deal Studio</h1>
                <p className="text-[13px] text-[#9ca3af]">Analyze bridge deals, study bidding and play sequences</p>
              </div>
            </div>
          </div>
          {!isGuest ? (
            <Link
              href="/dashboard/content/new?format=deal_analysis"
              className="group inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f2734] px-3.5 text-sm font-medium text-white transition hover:bg-[#374151] hover:shadow-md"
            >
              <FlaskConicalIcon className="size-4 transition-transform group-hover:rotate-12" />
              New analysis
            </Link>
          ) : (
            <a href="/auth/signin?callbackUrl=/dashboard/instruments/deal-studio" className="text-sm font-medium text-[#2f466d] hover:underline">
              Sign in to create
            </a>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] max-w-sm flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search deals..."
              className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white pl-8 pr-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
          </label>
          <FilterChip value={statusFilter} onChange={setStatusFilter as (v: StatusFilter | StatusFilter[]) => void} options={statusOptions} allLabel="All statuses" allValue="all" />

          <div className="ml-auto flex items-center gap-1">
            <span className="mr-2 text-xs text-[#9ca3af]">{totalLabel}</span>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex size-8 items-center justify-center rounded-md transition ${viewMode === "list" ? "bg-[#f3f4f6] text-[#1f2734]" : "text-[#9ca3af] hover:text-[#6b7280]"}`}
              title="List view"
            >
              <LayoutListIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex size-8 items-center justify-center rounded-md transition ${viewMode === "grid" ? "bg-[#f3f4f6] text-[#1f2734]" : "text-[#9ca3af] hover:text-[#6b7280]"}`}
              title="Grid view"
            >
              <LayoutGridIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Error */}
        {contentQuery.error ? (
          <div className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm text-[#9f1239]">
            Failed to load deals: {contentQuery.error.message}
          </div>
        ) : null}

        {/* List view */}
        {viewMode === "list" ? (
          <div className="border-t border-[#e5e7eb]">
            <div className="hidden border-b border-[#e5e7eb] px-1 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#9ca3af] md:grid md:grid-cols-[minmax(0,3fr)_100px_90px_100px_44px]">
              <span>Title</span>
              <span>Status</span>
              <span>Visibility</span>
              <span>Author</span>
              <span />
            </div>
            {items.map((item) => (
              <div
                key={item.id}
                className="group border-b border-[#f0f0f0] px-1 py-3 transition-colors hover:bg-[#fafbfc] md:grid md:grid-cols-[minmax(0,3fr)_100px_90px_100px_44px] md:items-center"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <DealSuitBadge id={item.id} />
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/content/${encodeURIComponent(item.id)}/study`}
                      className="text-sm font-medium text-[#1f2734] transition-colors hover:text-[#2f466d]"
                    >
                      {item.title}
                    </Link>
                    {item.summary ? (
                      <p className="mt-0.5 truncate text-xs text-[#9ca3af]">{item.summary}</p>
                    ) : null}
                    {item.tags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[11px] text-[#b0b7c3]">#{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1 md:mt-0">
                  <StatusBadge status={item.status} />
                </div>
                <div className="hidden text-xs text-[#9ca3af] md:block">
                  {item.visibility === "members_only" ? "Members" : item.visibility}
                </div>
                <div className="hidden truncate text-xs text-[#9ca3af] md:block">
                  {item.authorDisplayName ?? "—"}
                </div>
                <div className="mt-1 flex items-center justify-end md:mt-0">
                  <RowActionMenu item={item} isGuest={isGuest} isAuthor={item.authorUserId === session?.user?.id} onArchive={setArchiveTarget} onUnarchive={handleUnarchive} onDelete={setDeleteTarget} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Grid view */}
        {viewMode === "grid" ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-[#e5e7eb] bg-white transition-all hover:border-[#d1d5db] hover:shadow-md"
              >
                {/* Suit accent bar */}
                <div className="flex h-1.5 overflow-hidden rounded-t-xl">
                  <div className="flex-1 bg-[#1f2734]" />
                  <div className="flex-1 bg-red-400" />
                  <div className="flex-1 bg-orange-400" />
                  <div className="flex-1 bg-emerald-500" />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/content/${encodeURIComponent(item.id)}/study`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <DealSuitBadge id={item.id} />
                        <h2 className="truncate text-sm font-semibold text-[#1f2734] transition-colors group-hover:text-[#2f466d]">
                          {item.title}
                        </h2>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={item.status} />
                      {!isGuest ? (
                        <RowActionMenu item={item} isGuest={isGuest} isAuthor={item.authorUserId === session?.user?.id} onArchive={setArchiveTarget} onUnarchive={handleUnarchive} onDelete={setDeleteTarget} />
                      ) : null}
                    </div>
                  </div>

                  {item.summary ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6b7280]">{item.summary}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[11px] text-[#9ca3af]">
                      {item.visibility === "members_only" ? "Members" : item.visibility}
                    </span>
                    {item.authorDisplayName ? (
                      <span className="text-[11px] text-[#9ca3af]">{item.authorDisplayName}</span>
                    ) : null}
                    {item.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[11px] text-[#b0b7c3]">#{tag}</span>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 flex items-center gap-1 border-t border-[#f3f4f6] pt-3">
                    <Link
                      href={`/dashboard/content/${encodeURIComponent(item.id)}/study`}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-[#1f2734] px-2.5 text-xs font-medium text-white transition hover:bg-[#374151]"
                    >
                      <FlaskConicalIcon className="size-3" />
                      Studio
                    </Link>
                    <Link
                      href={`/dashboard/content/${encodeURIComponent(item.id)}`}
                      className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#374151]"
                    >
                      Open
                    </Link>
                    {!isGuest ? (
                      <Link
                        href={`/dashboard/content/${encodeURIComponent(item.id)}/edit`}
                        className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#374151]"
                      >
                        Edit
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {/* Empty state */}
        {items.length === 0 && !contentQuery.isLoading ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb]">
              <FlaskConicalIcon className="size-7 text-[#9ca3af]" />
            </div>
            <p className="mt-4 text-base font-medium text-[#374151]">No deal analyses found</p>
            <p className="mt-1 text-sm text-[#9ca3af]">
              {isGuest
                ? "Sign in to create your first deal analysis."
                : "Create a new deal analysis to get started."}
            </p>
            {!isGuest ? (
              <Link
                href="/dashboard/content/new?format=deal_analysis"
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f2734] px-4 text-sm font-medium text-white transition hover:bg-[#374151]"
              >
                <SparklesIcon className="size-4" />
                Create first analysis
              </Link>
            ) : null}
          </div>
        ) : null}

        {/* Loading skeleton */}
        {contentQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-[#f3f4f6]" />
            ))}
          </div>
        ) : null}
      </div>

      {/* Archive confirmation dialog */}
      {archiveTarget ? (
        <ArchiveDialog
          target={archiveTarget}
          isPending={archiveMutation.isPending}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchiveTarget(null)}
        />
      ) : null}

      {/* Delete confirmation dialog */}
      {deleteTarget ? (
        <DeleteDialog
          target={deleteTarget}
          isPending={hardDeleteMutation.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {/* Toast */}
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </PortalPageShell>
  )
}
