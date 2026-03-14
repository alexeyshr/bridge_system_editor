"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  LoaderCircleIcon,
  PlusIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"

import { ContentBlockRenderer } from "@/components/content-block-renderer"
import { parseBridgeDealSourceUrl } from "@/lib/bridge/deal-source-parser"
import { trpc } from "@/lib/trpc/react"
import type { ContentBlock, ContentLinkInput } from "@/lib/validation/content"

const FORMATS = ["article", "deal_analysis", "auction_lesson", "tournament_recap", "quiz"] as const
const VISIBILITIES = ["members_only", "public"] as const
const LINK_TYPES = ["system", "tournament", "content", "external"] as const
const BLOCK_TYPES = ["text", "callout", "deal", "auction", "question", "answer"] as const
const DEAL_SEATS = ["north", "east", "south", "west"] as const
const DEAL_SUITS = ["spades", "hearts", "diamonds", "clubs"] as const
const AUCTION_SEATS = ["W", "N", "E", "S"] as const
const AUCTION_LEVELS = ["1", "2", "3", "4", "5", "6", "7"] as const
const AUCTION_DENOMS = ["C", "D", "H", "S", "NT"] as const

const DEAL_SEAT_LABELS: Record<(typeof DEAL_SEATS)[number], string> = {
  north: "North (N)",
  east: "East (E)",
  south: "South (S)",
  west: "West (W)",
}

const DEAL_SUIT_META: Record<(typeof DEAL_SUITS)[number], { symbol: string; colorClassName: string }> = {
  spades: { symbol: "♠", colorClassName: "text-[#2b3446]" },
  hearts: { symbol: "♥", colorClassName: "text-[#9e2d36]" },
  diamonds: { symbol: "♦", colorClassName: "text-[#b7692f]" },
  clubs: { symbol: "♣", colorClassName: "text-[#2f6a4a]" },
}

const AUCTION_DENOM_LABELS: Record<(typeof AUCTION_DENOMS)[number], string> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠",
  NT: "NT",
}

type ContentFormat = (typeof FORMATS)[number]
type ContentVisibility = (typeof VISIBILITIES)[number]
type ContentLinkTarget = (typeof LINK_TYPES)[number]
type BlockType = (typeof BLOCK_TYPES)[number]
type DealSeat = (typeof DEAL_SEATS)[number]
type DealSuit = (typeof DEAL_SUITS)[number]
type AuctionSeat = (typeof AUCTION_SEATS)[number]

type DealHand = Partial<Record<DealSuit, string>>
type DealHands = Partial<Record<DealSeat, DealHand | string>>
type DealBlock = Extract<ContentBlock, { type: "deal" }>
type AuctionBlock = Extract<ContentBlock, { type: "auction" }>

type SpaceOption = {
  id: string
  name: string
  visibility: "public" | "hidden"
  actorRole: "owner" | "admin" | "editor" | "member" | "guest"
}

type ItemState = {
  id: string
  title: string
  summary: string | null
  spaceId: string
  format: ContentFormat
  visibility: ContentVisibility
  status: "draft" | "published" | "archived"
  blocks: ContentBlock[]
  tags: string[]
  links: Array<{
    targetType: ContentLinkTarget
    targetId: string | null
    url: string | null
    label: string | null
  }>
}

function defaultBlock(type: BlockType): ContentBlock {
  if (type === "text") return { type: "text", markdown: "" }
  if (type === "callout") return { type: "callout", tone: "info", text: "" }
  if (type === "deal") return { type: "deal", board: "", dealer: "N", vulnerability: "none", sourceUrl: "", hands: { north: {}, east: {}, south: {}, west: {} } }
  if (type === "auction") return { type: "auction", startingSeat: "W", sequence: [], notes: "" }
  if (type === "question") return { type: "question", question: "", options: [""] }
  return { type: "answer", text: "" }
}

function normalizeDealHand(value: unknown): DealHand {
  if (!value) return {}
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return {}
    const dotParts = trimmed.split(".").map((part) => part.trim())
    if (dotParts.length === 4) {
      return {
        spades: dotParts[0] || "",
        hearts: dotParts[1] || "",
        diamonds: dotParts[2] || "",
        clubs: dotParts[3] || "",
      }
    }
    return { spades: trimmed }
  }
  if (typeof value !== "object") return {}

  const source = value as Record<string, unknown>
  return {
    spades: typeof source.spades === "string" ? source.spades : "",
    hearts: typeof source.hearts === "string" ? source.hearts : "",
    diamonds: typeof source.diamonds === "string" ? source.diamonds : "",
    clubs: typeof source.clubs === "string" ? source.clubs : "",
  }
}

function normalizeDealHands(value: DealHands | undefined): Record<DealSeat, DealHand> {
  return {
    north: normalizeDealHand(value?.north),
    east: normalizeDealHand(value?.east),
    south: normalizeDealHand(value?.south),
    west: normalizeDealHand(value?.west),
  }
}

function hasAnyDealHands(hands: DealHands | undefined): boolean {
  if (!hands) return false
  const normalized = normalizeDealHands(hands)
  return DEAL_SEATS.some((seat) =>
    DEAL_SUITS.some((suit) => Boolean(normalized[seat][suit]?.trim())),
  )
}

function normalizeAuctionCall(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const compact = trimmed
    .toUpperCase()
    .replace(/[♣]/g, "C")
    .replace(/[♦]/g, "D")
    .replace(/[♥]/g, "H")
    .replace(/[♠]/g, "S")
    .replace(/[;,.]+$/g, "")
    .replace(/\s+/g, "")

  if (compact === "P" || compact === "PASS") return "P"
  if (compact === "X" || compact === "DBL" || compact === "DOUBLE") return "X"
  if (compact === "XX" || compact === "RDBL" || compact === "REDOUBLE") return "XX"

  const contract = compact.match(/^([1-7])(C|D|H|S|N|NT)$/)
  if (contract) {
    const level = contract[1]
    const denom = contract[2] === "N" ? "NT" : contract[2]
    return `${level}${denom}`
  }

  return compact
}

function parseAuctionSequence(raw: string): string[] {
  return raw
    .split(/\s+/)
    .map((token) => normalizeAuctionCall(token))
    .filter((token): token is string => Boolean(token))
}

function normalizeAuctionSequence(sequence: string[]): string[] {
  return sequence
    .map((token) => normalizeAuctionCall(token))
    .filter((token): token is string => Boolean(token))
}

function getAuctionSeatAt(startingSeat: AuctionSeat, callIndex: number): AuctionSeat {
  const startIndex = AUCTION_SEATS.indexOf(startingSeat)
  if (startIndex < 0) return "W"
  const next = (startIndex + callIndex) % AUCTION_SEATS.length
  return AUCTION_SEATS[next] ?? "W"
}

function buildAuctionTableRows(startingSeat: AuctionSeat, sequence: string[]): Array<Array<string | null>> {
  const startIndex = AUCTION_SEATS.indexOf(startingSeat)
  const paddedPrefix = Array.from({ length: startIndex < 0 ? 0 : startIndex }, () => null)
  const cells = [...paddedPrefix, ...sequence]
  if (cells.length === 0) return []

  const rows: Array<Array<string | null>> = []
  for (let offset = 0; offset < cells.length; offset += AUCTION_SEATS.length) {
    const slice = cells.slice(offset, offset + AUCTION_SEATS.length)
    while (slice.length < AUCTION_SEATS.length) slice.push(null)
    rows.push(slice)
  }
  return rows
}

function parseTags(input: string): string[] {
  return [...new Set(input.split(",").map((v) => v.trim()).filter(Boolean))]
}

function blockError(block: ContentBlock): string | null {
  if (block.type === "text") return block.markdown.trim() ? null : "Text is required."
  if (block.type === "callout") return block.text.trim() ? null : "Callout text is required."
  if (block.type === "deal") {
    if (block.sourceUrl?.trim()) return null
    return hasAnyDealHands(block.hands) ? null : "Deal requires either hands data or source URL."
  }
  if (block.type === "auction") return block.sequence.some((v) => v.trim()) ? null : "Auction sequence is required."
  if (block.type === "question") return block.question.trim() ? null : "Question is required."
  if (block.type === "answer") return block.text.trim() ? null : "Answer text is required."
  return null
}

export function ContentEditorWorkspace({ mode, contentId }: { mode: "create" | "edit"; contentId?: string }) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const isEdit = mode === "edit" && Boolean(contentId)
  const hydratedRef = React.useRef(false)

  const [spaceId, setSpaceId] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [summary, setSummary] = React.useState("")
  const [format, setFormat] = React.useState<ContentFormat>("article")
  const [visibility, setVisibility] = React.useState<ContentVisibility>("members_only")
  const [tagsInput, setTagsInput] = React.useState("")
  const [links, setLinks] = React.useState<ContentLinkInput[]>([])
  const [blocks, setBlocks] = React.useState<ContentBlock[]>([{ type: "text", markdown: "" }])
  const [addType, setAddType] = React.useState<BlockType>("text")
  const [tab, setTab] = React.useState<"edit" | "preview">("edit")
  const [saveState, setSaveState] = React.useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle")
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [auctionDraftLevel, setAuctionDraftLevel] = React.useState<(typeof AUCTION_LEVELS)[number]>("1")
  const [auctionManualDrafts, setAuctionManualDrafts] = React.useState<Record<number, string>>({})

  const spacesQuery = trpc.spaces.list.useQuery(undefined, { staleTime: 15_000 })
  const itemQuery = trpc.content.get.useQuery({ contentId: contentId ?? "" }, { enabled: isEdit })
  const createDraft = trpc.content.create.useMutation()
  const updateDraft = trpc.content.updateDraft.useMutation()
  const publishItem = trpc.content.publish.useMutation()
  const archiveItem = trpc.content.archive.useMutation()

  const spaces = React.useMemo(
    () => (spacesQuery.data?.spaces ?? []) as SpaceOption[],
    [spacesQuery.data?.spaces],
  )
  const writableSpaces = React.useMemo(
    () => spaces.filter((space) => ["owner", "admin", "editor"].includes(space.actorRole)),
    [spaces],
  )
  const selectedSpace = React.useMemo(
    () => spaces.find((space) => space.id === spaceId) ?? null,
    [spaceId, spaces],
  )
  const item = (itemQuery.data?.item ?? null) as ItemState | null

  React.useEffect(() => {
    hydratedRef.current = false
  }, [contentId, isEdit])

  React.useEffect(() => {
    if (!isEdit && !spaceId && writableSpaces.length > 0) setSpaceId(writableSpaces[0].id)
  }, [isEdit, spaceId, writableSpaces])

  React.useEffect(() => {
    if (!isEdit || !item || hydratedRef.current) return
    setSpaceId(item.spaceId)
    setTitle(item.title)
    setSummary(item.summary ?? "")
    setFormat(item.format)
    setVisibility(item.visibility)
    setTagsInput(item.tags.join(", "))
    setLinks(item.links.map((link) => ({ ...link })))
    setBlocks(item.blocks.length > 0 ? item.blocks : [{ type: "text", markdown: "" }])
    hydratedRef.current = true
  }, [isEdit, item])

  const hiddenPublicConflict = selectedSpace?.visibility === "hidden" && visibility === "public"
  const validation = React.useMemo(() => {
    const issues: string[] = []
    if (!spaceId) issues.push("Select a space.")
    if (!title.trim()) issues.push("Title is required.")
    if (blocks.length === 0) issues.push("At least one block is required.")
    blocks.forEach((block, index) => {
      const issue = blockError(block)
      if (issue) issues.push(`Block #${index + 1}: ${issue}`)
    })
    links.forEach((link, index) => {
      if (link.targetType === "external" && !link.url?.trim()) issues.push(`Link #${index + 1}: URL is required.`)
      if (link.targetType !== "external" && !link.targetId?.trim()) issues.push(`Link #${index + 1}: target id is required.`)
    })
    return issues
  }, [blocks, links, spaceId, title])

  const payload = React.useMemo(
    () => ({
      spaceId,
      title: title.trim(),
      summary: summary.trim() ? summary.trim() : null,
      format,
      visibility,
      tags: parseTags(tagsInput),
      links: links.map((link) => ({
        targetType: link.targetType,
        targetId: link.targetId?.trim() || null,
        url: link.url?.trim() || null,
        label: link.label?.trim() || null,
      })),
      blocks,
    }),
    [spaceId, title, summary, format, visibility, tagsInput, links, blocks],
  )

  const setDirty = React.useCallback(() => {
    setSaveState((prev) => (prev === "saving" ? prev : "dirty"))
    setMessage(null)
    setError(null)
  }, [])

  const updateBlockAt = React.useCallback(
    (index: number, nextBlock: ContentBlock) => {
      setBlocks((prev) => prev.map((value, current) => (current === index ? nextBlock : value)))
      setDirty()
    },
    [setDirty],
  )

  const save = React.useCallback(() => {
    setMessage(null)
    setError(null)
    if (validation.length > 0) {
      setSaveState("error")
      setError(validation[0] ?? "Validation error")
      return
    }
    setSaveState("saving")
    if (!isEdit) {
      createDraft.mutate(payload, {
        onSuccess: async ({ item: created }) => {
          setSaveState("saved")
          setMessage("Draft created.")
          await Promise.all([utils.content.list.invalidate(), utils.content.feed.invalidate()])
          router.replace(`/dashboard/content/${encodeURIComponent(created.id)}/edit`)
        },
        onError: (reason) => {
          setSaveState("error")
          setError(reason.message || "Failed to create draft.")
        },
      })
      return
    }
    updateDraft.mutate(
      {
        contentId: contentId!,
        data: {
          title: payload.title,
          summary: payload.summary,
          format: payload.format,
          visibility: payload.visibility,
          tags: payload.tags,
          links: payload.links,
          blocks: payload.blocks,
        },
      },
      {
        onSuccess: async () => {
          setSaveState("saved")
          setMessage("Draft saved.")
          await Promise.all([utils.content.list.invalidate(), utils.content.feed.invalidate(), itemQuery.refetch()])
        },
        onError: (reason) => {
          setSaveState("error")
          setError(reason.message || "Failed to save draft.")
        },
      },
    )
  }, [contentId, createDraft, isEdit, itemQuery, payload, router, updateDraft, utils.content.feed, utils.content.list, validation])

  const publish = React.useCallback(() => {
    if (!contentId || hiddenPublicConflict) return
    if (!window.confirm("Publish this content?")) return
    publishItem.mutate(
      { contentId, data: {} },
      {
        onSuccess: async () => {
          setMessage("Published successfully.")
          setError(null)
          await Promise.all([utils.content.list.invalidate(), utils.content.feed.invalidate(), itemQuery.refetch()])
        },
        onError: (reason) => setError(reason.message || "Failed to publish."),
      },
    )
  }, [contentId, hiddenPublicConflict, itemQuery, publishItem, utils.content.feed, utils.content.list])

  const archive = React.useCallback(() => {
    if (!contentId) return
    if (!window.confirm("Archive this content?")) return
    archiveItem.mutate(
      { contentId, data: {} },
      {
        onSuccess: async () => {
          setMessage("Archived successfully.")
          setError(null)
          await Promise.all([utils.content.list.invalidate(), utils.content.feed.invalidate(), itemQuery.refetch()])
        },
        onError: (reason) => setError(reason.message || "Failed to archive."),
      },
    )
  }, [archiveItem, contentId, itemQuery, utils.content.feed, utils.content.list])

  const busy = createDraft.isPending || updateDraft.isPending || publishItem.isPending || archiveItem.isPending
  const canPublish = isEdit && Boolean(contentId) && !hiddenPublicConflict && item?.status !== "archived"
  const canArchive = isEdit && Boolean(contentId) && item?.status !== "archived"

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <section className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-[#1f2734]">{isEdit ? "Edit content draft" : "Create content draft"}</h1>
            <p className="mt-1 text-sm text-[#6e7788]">Draft editor for portal content blocks and lifecycle.</p>
          </div>
          <span className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#5f6a7b]">
            {saveState}
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select value={spaceId} onChange={(e) => { setSpaceId(e.target.value); setDirty() }} disabled={isEdit} className="h-9 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm">
            <option value="">Select space</option>
            {writableSpaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
          </select>
          <select value={format} onChange={(e) => { setFormat(e.target.value as ContentFormat); setDirty() }} className="h-9 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm">
            {FORMATS.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
          <select value={visibility} onChange={(e) => { setVisibility(e.target.value as ContentVisibility); setDirty() }} className="h-9 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm">
            {VISIBILITIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        <input value={title} onChange={(e) => { setTitle(e.target.value); setDirty() }} placeholder="Title" className="mt-2 h-10 w-full rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-3 text-sm" />
        <textarea value={summary} onChange={(e) => { setSummary(e.target.value); setDirty() }} rows={2} placeholder="Summary" className="mt-2 w-full rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-3 py-2 text-sm" />
        <input value={tagsInput} onChange={(e) => { setTagsInput(e.target.value); setDirty() }} placeholder="Tags (comma-separated)" className="mt-2 h-9 w-full rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-3 text-sm" />

        {hiddenPublicConflict ? <p className="mt-2 rounded-lg border border-[#f0d8ba] bg-[#fff6ea] px-3 py-2 text-sm text-[#8a5a1b]">Hidden space cannot publish public content.</p> : null}
        {validation.length > 0 ? <p className="mt-2 text-sm text-[#8b3240]">{validation[0]}</p> : null}
        {error ? <p className="mt-2 inline-flex items-center gap-1 text-sm text-[#8b3240]"><AlertCircleIcon className="size-4" />{error}</p> : null}
        {message ? <p className="mt-2 text-sm text-[#2f6a4a]">{message}</p> : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={save} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-3 text-sm font-medium text-[#2f466d] disabled:opacity-60">
            {busy ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            {isEdit ? "Save draft" : "Create draft"}
          </button>
          <button type="button" onClick={publish} disabled={!canPublish || busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#bad9c7] bg-[#eaf8f0] px-3 text-sm font-medium text-[#2b6b49] disabled:opacity-60">
            <SendIcon className="size-4" /> Publish
          </button>
          <button type="button" onClick={archive} disabled={!canArchive || busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8dbe1] bg-[#f3f5f9] px-3 text-sm font-medium text-[#5f6a7b] disabled:opacity-60">
            <ArchiveIcon className="size-4" /> Archive
          </button>
          {isEdit && contentId && format === "deal_analysis" ? (
            <Link href={`/dashboard/content/${encodeURIComponent(contentId)}/study`} className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-[#f5f7fb] px-3 text-sm text-[#4f5e78]">
              Deal studio
            </Link>
          ) : null}
          {isEdit && contentId ? <Link href={`/dashboard/content/${encodeURIComponent(contentId)}`} className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-white px-3 text-sm text-[#4f5e78]"><EyeIcon className="size-4" />View</Link> : null}
          <Link href="/dashboard/content" className="text-sm text-[#5f6a7b] hover:text-[#2f466d]">Back to content</Link>
        </div>
      </section>

      <section className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-0.5">
            <button type="button" onClick={() => setTab("edit")} className={`h-8 rounded-md px-3 text-sm ${tab === "edit" ? "bg-white text-[#1f2734]" : "text-[#6e7788]"}`}>Edit</button>
            <button type="button" onClick={() => setTab("preview")} className={`h-8 rounded-md px-3 text-sm ${tab === "preview" ? "bg-white text-[#1f2734]" : "text-[#6e7788]"}`}>Preview</button>
          </div>
          {tab === "edit" ? (
            <div className="flex items-center gap-2">
              <select value={addType} onChange={(e) => setAddType(e.target.value as BlockType)} className="h-8 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm">
                {BLOCK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <button type="button" onClick={() => { setBlocks((prev) => [...prev, defaultBlock(addType)]); setDirty() }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-2.5 text-sm font-medium text-[#2f466d]">
                <PlusIcon className="size-4" /> Add block
              </button>
            </div>
          ) : null}
        </div>

        {tab === "preview" ? (
          <div className="mt-3 space-y-2">
            {blocks.map((block, index) => (
              <ContentBlockRenderer key={`preview-${block.type}-${index}`} block={block} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {blocks.map((block, index) => (
              <article key={`${block.type}-${index}`} className="rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7a8394]">{block.type} #{index + 1}</p>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { if (index === 0) return; setBlocks((prev) => { const next = [...prev]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next }); setDirty() }} className="inline-flex size-7 items-center justify-center rounded-md border border-[#d8dbe1] bg-white text-[#5f6a7b]" disabled={index === 0}><ArrowUpIcon className="size-3.5" /></button>
                    <button type="button" onClick={() => { if (index === blocks.length - 1) return; setBlocks((prev) => { const next = [...prev]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next }); setDirty() }} className="inline-flex size-7 items-center justify-center rounded-md border border-[#d8dbe1] bg-white text-[#5f6a7b]" disabled={index === blocks.length - 1}><ArrowDownIcon className="size-3.5" /></button>
                    <button type="button" onClick={() => { if (blocks.length === 1) return; setBlocks((prev) => prev.filter((_, current) => current !== index)); setDirty() }} className="inline-flex size-7 items-center justify-center rounded-md border border-[#e8c9d0] bg-[#fff4f6] text-[#8b3240]" disabled={blocks.length === 1}><Trash2Icon className="size-3.5" /></button>
                  </div>
                </div>

                {block.type === "text" ? <textarea value={block.markdown} onChange={(e) => { setBlocks((prev) => prev.map((value, current) => current === index ? { ...block, markdown: e.target.value } : value)); setDirty() }} rows={3} className="mt-2 w-full rounded-lg border border-[#d8dbe1] bg-white px-2.5 py-2 text-sm" /> : null}
                {block.type === "callout" ? <input value={block.text} onChange={(e) => { setBlocks((prev) => prev.map((value, current) => current === index ? { ...block, text: e.target.value } : value)); setDirty() }} className="mt-2 h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm" placeholder="Callout text" /> : null}
                {block.type === "deal" ? (() => {
                  const dealBlock = block as DealBlock
                  const dealMode: "hands" | "link" = dealBlock.hands === undefined ? "link" : "hands"
                  const normalizedHands = normalizeDealHands(dealBlock.hands)

                  return (
                    <div className="mt-2 space-y-2">
                      <div className="grid gap-2 md:grid-cols-3">
                        <input
                          value={dealBlock.board ?? ""}
                          onChange={(e) => updateBlockAt(index, { ...dealBlock, board: e.target.value })}
                          className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm"
                          placeholder="Board (optional)"
                        />
                        <select
                          value={dealBlock.dealer ?? "N"}
                          onChange={(e) => updateBlockAt(index, { ...dealBlock, dealer: e.target.value as "N" | "E" | "S" | "W" })}
                          className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm"
                        >
                          <option value="N">Dealer: North</option>
                          <option value="E">Dealer: East</option>
                          <option value="S">Dealer: South</option>
                          <option value="W">Dealer: West</option>
                        </select>
                        <select
                          value={dealBlock.vulnerability ?? "none"}
                          onChange={(e) => updateBlockAt(index, { ...dealBlock, vulnerability: e.target.value as "none" | "ns" | "ew" | "all" })}
                          className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm"
                        >
                          <option value="none">Vulnerability: none</option>
                          <option value="ns">Vulnerability: NS</option>
                          <option value="ew">Vulnerability: EW</option>
                          <option value="all">Vulnerability: all</option>
                        </select>
                      </div>

                      <div className="inline-flex rounded-lg border border-[#d8dbe1] bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => updateBlockAt(index, { ...dealBlock, hands: normalizedHands })}
                          className={`h-8 rounded-md px-3 text-sm ${dealMode === "hands" ? "bg-[#eef3fb] text-[#2f466d]" : "text-[#6e7788]"}`}
                        >
                          Hands layout
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBlockAt(index, { ...dealBlock, hands: undefined })}
                          className={`h-8 rounded-md px-3 text-sm ${dealMode === "link" ? "bg-[#eef3fb] text-[#2f466d]" : "text-[#6e7788]"}`}
                        >
                          Deal link
                        </button>
                      </div>

                      {dealMode === "link" ? (
                        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                          <input
                            value={dealBlock.sourceUrl ?? ""}
                            onChange={(e) => updateBlockAt(index, { ...dealBlock, sourceUrl: e.target.value, hands: undefined })}
                            className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm"
                            placeholder="https://... (BBO handviewer link)"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const parsed = parseBridgeDealSourceUrl(dealBlock.sourceUrl ?? "")
                              if (!parsed) {
                                setError("Could not parse deal link. Use Bridge Base handviewer URL with n/e/s/w cards.")
                                setMessage(null)
                                return
                              }

                              updateBlockAt(index, {
                                ...dealBlock,
                                board: parsed.board ?? dealBlock.board ?? "",
                                dealer: parsed.dealer ?? dealBlock.dealer ?? "N",
                                vulnerability: parsed.vulnerability ?? dealBlock.vulnerability ?? "none",
                                sourceUrl: parsed.sourceUrl,
                                hands: parsed.hands,
                              })
                              setError(null)
                              setMessage("Deal parsed from link into N/E/S/W hands.")
                            }}
                            className="inline-flex h-9 items-center rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-3 text-sm font-medium text-[#2f466d] hover:bg-[#e2ebfa]"
                          >
                            Parse link
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid gap-2 lg:grid-cols-2">
                            {DEAL_SEATS.map((seat) => {
                              const hand = normalizedHands[seat]
                              return (
                                <article key={seat} className="rounded-lg border border-[#d8dbe1] bg-white p-2.5">
                                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7a8394]">{DEAL_SEAT_LABELS[seat]}</p>
                                  <div className="mt-1 space-y-1.5">
                                    {DEAL_SUITS.map((suit) => (
                                      <label key={`${seat}-${suit}`} className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-1.5">
                                        <span className={`text-sm font-semibold ${DEAL_SUIT_META[suit].colorClassName}`}>{DEAL_SUIT_META[suit].symbol}</span>
                                        <input
                                          value={hand[suit] ?? ""}
                                          onChange={(e) => {
                                            updateBlockAt(index, {
                                              ...dealBlock,
                                              hands: {
                                                ...normalizedHands,
                                                [seat]: {
                                                  ...hand,
                                                  [suit]: e.target.value.toUpperCase(),
                                                },
                                              },
                                            })
                                          }}
                                          className="h-8 rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-sm"
                                          placeholder="AKQJ"
                                        />
                                      </label>
                                    ))}
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                          <input
                            value={dealBlock.sourceUrl ?? ""}
                            onChange={(e) => updateBlockAt(index, { ...dealBlock, sourceUrl: e.target.value })}
                            className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm"
                            placeholder="Source URL (optional)"
                          />
                        </div>
                      )}
                    </div>
                  )
                })() : null}
                {block.type === "auction" ? (() => {
                  const auctionBlock = block as AuctionBlock
                  const startingSeat = auctionBlock.startingSeat ?? "W"
                  const normalizedSequence = normalizeAuctionSequence(auctionBlock.sequence)
                  const manualValue = normalizedSequence.join(" ")
                  const manualDraft = auctionManualDrafts[index] ?? manualValue
                  const nextSeat = getAuctionSeatAt(startingSeat, normalizedSequence.length)
                  const auctionRows = buildAuctionTableRows(startingSeat, normalizedSequence)

                  const commitManualSequence = (raw: string) => {
                    const parsed = parseAuctionSequence(raw)
                    const nextSequence = normalizeAuctionSequence(parsed)
                    updateBlockAt(index, {
                      ...auctionBlock,
                      startingSeat,
                      sequence: nextSequence,
                    })
                    setAuctionManualDrafts((prev) => ({ ...prev, [index]: nextSequence.join(" ") }))
                  }

                  const pushCall = (call: string) => {
                    const normalizedCall = normalizeAuctionCall(call)
                    if (!normalizedCall) return
                    const nextSequence = [...normalizedSequence, normalizedCall]
                    updateBlockAt(index, {
                      ...auctionBlock,
                      startingSeat,
                      sequence: nextSequence,
                    })
                    setAuctionManualDrafts((prev) => ({ ...prev, [index]: nextSequence.join(" ") }))
                  }

                  return (
                    <div className="mt-2 space-y-2">
                      <div className="grid gap-2 md:grid-cols-[170px_minmax(0,1fr)]">
                        <select
                          value={startingSeat}
                          onChange={(e) =>
                            updateBlockAt(index, {
                              ...auctionBlock,
                              startingSeat: e.target.value as AuctionSeat,
                              sequence: normalizedSequence,
                            })
                          }
                          className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm"
                        >
                          <option value="W">Start: W</option>
                          <option value="N">Start: N</option>
                          <option value="E">Start: E</option>
                          <option value="S">Start: S</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                          <input
                            value={manualDraft}
                            onChange={(e) =>
                              setAuctionManualDrafts((prev) => ({ ...prev, [index]: e.target.value }))
                            }
                            onBlur={(e) => commitManualSequence(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return
                              e.preventDefault()
                              commitManualSequence((e.target as HTMLInputElement).value)
                            }}
                            className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm"
                            placeholder="Quick input: 1C P 1H P 2NT"
                          />
                          <button
                            type="button"
                            onClick={() => commitManualSequence(manualDraft)}
                            className="inline-flex h-9 items-center rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-3 text-sm font-medium text-[#2f466d] hover:bg-[#e2ebfa]"
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#d8dbe1] bg-white p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7a8394]">
                            Next seat: <span className="text-[#2f466d]">{nextSeat}</span>
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const nextSequence = normalizedSequence.slice(0, -1)
                                updateBlockAt(index, {
                                  ...auctionBlock,
                                  startingSeat,
                                  sequence: nextSequence,
                                })
                                setAuctionManualDrafts((prev) => ({ ...prev, [index]: nextSequence.join(" ") }))
                              }}
                              className="inline-flex h-7 items-center rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b] hover:bg-white"
                              disabled={normalizedSequence.length === 0}
                            >
                              Undo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateBlockAt(index, {
                                  ...auctionBlock,
                                  startingSeat,
                                  sequence: [],
                                })
                                setAuctionManualDrafts((prev) => ({ ...prev, [index]: "" }))
                              }}
                              className="inline-flex h-7 items-center rounded-md border border-[#e8c9d0] bg-[#fff4f6] px-2 text-xs text-[#8b3240] hover:bg-[#ffeef2]"
                              disabled={normalizedSequence.length === 0}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <select
                            value={auctionDraftLevel}
                            onChange={(e) => setAuctionDraftLevel(e.target.value as (typeof AUCTION_LEVELS)[number])}
                            className="h-8 rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-sm text-[#1f2734]"
                          >
                            {AUCTION_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                Level {level}
                              </option>
                            ))}
                          </select>
                          {AUCTION_DENOMS.map((denom) => (
                            <button
                              key={`${index}-${denom}`}
                              type="button"
                              onClick={() => pushCall(`${auctionDraftLevel}${denom}`)}
                              className="inline-flex h-8 min-w-9 items-center justify-center rounded-md border border-[#cfd5df] bg-[#eef3fb] px-2 text-sm font-medium text-[#2f466d] hover:bg-[#e2ebfa]"
                              title={`Add ${auctionDraftLevel}${denom}`}
                            >
                              {AUCTION_DENOM_LABELS[denom]}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => pushCall("P")}
                            className="inline-flex h-8 items-center rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm text-[#4f5e78] hover:bg-white"
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => pushCall("X")}
                            className="inline-flex h-8 items-center rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm text-[#4f5e78] hover:bg-white"
                          >
                            X
                          </button>
                          <button
                            type="button"
                            onClick={() => pushCall("XX")}
                            className="inline-flex h-8 items-center rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 text-sm text-[#4f5e78] hover:bg-white"
                          >
                            XX
                          </button>
                        </div>

                        <div className="mt-2 overflow-hidden rounded-lg border border-[#d8dbe1]">
                          <table className="w-full border-collapse text-xs">
                            <thead className="bg-[#f3f6fb] text-[#5f6a7b]">
                              <tr>
                                {AUCTION_SEATS.map((seat) => (
                                  <th
                                    key={`${index}-head-${seat}`}
                                    className={`border-b border-[#d8dbe1] px-2 py-1.5 text-center font-semibold ${
                                      seat === nextSeat ? "bg-[#eaf0fb] text-[#2f466d]" : ""
                                    }`}
                                  >
                                    {seat}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {auctionRows.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-2 py-2 text-center text-[#7a8394]">
                                    No calls yet.
                                  </td>
                                </tr>
                              ) : (
                                auctionRows.map((row, rowIndex) => (
                                  <tr key={`${index}-row-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#fbfcff]"}>
                                    {row.map((cell, cellIndex) => (
                                      <td key={`${index}-cell-${rowIndex}-${cellIndex}`} className="border-t border-[#edf0f5] px-2 py-1.5 text-center font-medium text-[#2f466d]">
                                        {cell ?? "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {normalizedSequence.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {normalizedSequence.map((call, callIndex) => (
                              <span
                                key={`${call}-${callIndex}`}
                                className="inline-flex items-center gap-1 rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs text-[#4f5e78]"
                              >
                                <span className="font-semibold text-[#2f466d]">{getAuctionSeatAt(startingSeat, callIndex)}</span>
                                <span>{call}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[#7a8394]">No calls yet. Use quick input or call buttons.</p>
                        )}
                      </div>

                      <input
                        value={auctionBlock.notes ?? ""}
                        onChange={(e) =>
                          updateBlockAt(index, {
                            ...auctionBlock,
                            notes: e.target.value,
                            sequence: normalizedSequence,
                            startingSeat,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm"
                        placeholder="Auction notes (optional)"
                      />
                    </div>
                  )
                })() : null}
                {block.type === "question" ? <input value={block.question} onChange={(e) => { setBlocks((prev) => prev.map((value, current) => current === index ? { ...block, question: e.target.value } : value)); setDirty() }} className="mt-2 h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2.5 text-sm" placeholder="Question text" /> : null}
                {block.type === "answer" ? <textarea value={block.text} onChange={(e) => { setBlocks((prev) => prev.map((value, current) => current === index ? { ...block, text: e.target.value } : value)); setDirty() }} rows={2} className="mt-2 w-full rounded-lg border border-[#d8dbe1] bg-white px-2.5 py-2 text-sm" placeholder="Answer text" /> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#1f2734]">Related links</h2>
          <button type="button" onClick={() => { setLinks((prev) => [...prev, { targetType: "external", targetId: "", url: "", label: "" }]); setDirty() }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-2.5 text-sm font-medium text-[#2f466d]">
            <PlusIcon className="size-4" /> Add link
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {links.map((link, index) => (
            <div key={`link-${index}`} className="grid gap-2 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-2 sm:grid-cols-12">
              <select value={link.targetType} onChange={(e) => { const value = e.target.value as ContentLinkTarget; setLinks((prev) => prev.map((item, current) => current === index ? { ...item, targetType: value } : item)); setDirty() }} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm sm:col-span-2">{LINK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
              <input value={link.targetId ?? ""} onChange={(e) => { setLinks((prev) => prev.map((item, current) => current === index ? { ...item, targetId: e.target.value } : item)); setDirty() }} placeholder="Target ID" className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm sm:col-span-3" />
              <input value={link.url ?? ""} onChange={(e) => { setLinks((prev) => prev.map((item, current) => current === index ? { ...item, url: e.target.value } : item)); setDirty() }} placeholder="URL" className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm sm:col-span-4" />
              <input value={link.label ?? ""} onChange={(e) => { setLinks((prev) => prev.map((item, current) => current === index ? { ...item, label: e.target.value } : item)); setDirty() }} placeholder="Label" className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm sm:col-span-2" />
              <button type="button" onClick={() => { setLinks((prev) => prev.filter((_, current) => current !== index)); setDirty() }} className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e8c9d0] bg-[#fff4f6] text-[#8b3240] sm:col-span-1"><Trash2Icon className="size-4" /></button>
            </div>
          ))}
          {links.length === 0 ? <p className="text-sm text-[#6e7788]">No links added yet.</p> : null}
        </div>
      </section>
    </div>
  )
}
