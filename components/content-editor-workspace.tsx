"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  AlignLeftIcon,
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  GavelIcon,
  HelpCircleIcon,
  InfoIcon,
  LayoutGridIcon,
  LoaderCircleIcon,
  MessageSquareIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  SendIcon,
  ImageIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { ContentBlockRenderer } from "@/components/content-block-renderer"
import { parseBridgeDealSourceUrl } from "@/lib/bridge/deal-source-parser"
import { trpc } from "@/lib/trpc/react"
import type { ContentBlock, ContentLinkInput } from "@/lib/validation/content"

const FORMATS = ["article", "deal_analysis", "auction_lesson", "tournament_recap", "quiz", "exercise"] as const
const VISIBILITIES = ["members_only", "public"] as const
const LINK_TYPES = ["system", "tournament", "content", "external"] as const
const BLOCK_TYPES = ["text", "callout", "deal", "auction", "question", "answer", "image"] as const
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

const AUCTION_DENOM_COLORS: Record<(typeof AUCTION_DENOMS)[number], { bg: string; text: string; border: string }> = {
  C: { bg: "bg-[#2f6a4a]", text: "text-white", border: "border-[#2f6a4a]" },
  D: { bg: "bg-[#b7692f]", text: "text-white", border: "border-[#b7692f]" },
  H: { bg: "bg-[#9e2d36]", text: "text-white", border: "border-[#9e2d36]" },
  S: { bg: "bg-[#2b3446]", text: "text-white", border: "border-[#2b3446]" },
  NT: { bg: "bg-[#1f2734]", text: "text-white", border: "border-[#1f2734]" },
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
type AuctionBlock = Extract<ContentBlock, { type: "auction" }> & { annotations?: Record<string, string>; vulnerability?: "none" | "ns" | "ew" | "all" }

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
  coverImageUrl: string | null
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
  if (type === "image") return { type: "image", url: "", alt: "", caption: "" }
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

function renderAuctionCall(call: string | null, footnote?: number): React.ReactNode {
  if (!call) return <span className="text-[#d1d5db]">—</span>
  const sup = footnote ? <sup className="ml-0.5 text-[9px] font-bold text-[#6366f1]">{footnote}</sup> : null
  if (call === "P") return <span className="italic text-[#9ca3af]">Pass{sup}</span>
  if (call === "X") return <span className="font-bold text-red-500">X{sup}</span>
  if (call === "XX") return <span className="font-bold text-blue-500">XX{sup}</span>
  const m = call.match(/^([1-7])(C|D|H|S|NT)$/)
  if (m) {
    const level = m[1]
    const denom = m[2] as keyof typeof AUCTION_DENOM_COLORS
    const symbol = AUCTION_DENOM_LABELS[denom]
    const denomColor: Record<string, string> = { C: "text-[#2f6a4a]", D: "text-[#b7692f]", H: "text-[#9e2d36]", S: "text-[#2b3446]", NT: "text-[#1f2734]" }
    return <span className="font-semibold">{level}<span className={denomColor[denom] ?? ""}>{symbol}</span>{sup}</span>
  }
  return <span className="font-medium">{call}{sup}</span>
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

function FormSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const activeLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? "Select…"
  const isActive = Boolean(value)

  const handleBlur = React.useCallback((e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) setOpen(false)
  }, [])

  return (
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className={`inline-flex h-9 w-full items-center justify-between gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20 ${
          disabled
            ? "cursor-not-allowed border-[#e5e7eb] bg-[#f9fafb] text-[#9ca3af] opacity-60"
            : isActive
              ? "border-[#1f2734]/20 bg-[#1f2734]/5 text-[#1f2734] hover:border-[#d1d5db]"
              : "border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280] hover:border-[#d1d5db] hover:bg-[#f3f4f6]"
        }`}
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDownIcon className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1.5 max-h-60 min-w-full overflow-auto rounded-xl border border-[#e5e7eb] bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[13px] transition ${
                value === opt.value
                  ? "bg-[#f3f4f6] font-medium text-[#1f2734]"
                  : "text-[#374151] hover:bg-[#fafbfc]"
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value ? <CheckIcon className="size-3.5 text-[#1f2734]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ContentEditorWorkspace({ mode, contentId }: { mode: "create" | "edit"; contentId?: string }) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const isEdit = mode === "edit" && Boolean(contentId)
  const hydratedRef = React.useRef(false)

  const [spaceId, setSpaceId] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [summary, setSummary] = React.useState("")
  const [coverImageUrl, setCoverImageUrl] = React.useState<string | null>(null)
  const [coverUploading, setCoverUploading] = React.useState(false)
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
  const [editingAnnotation, setEditingAnnotation] = React.useState<{ blockIndex: number; callIndex: number } | null>(null)
  const [annotationDraft, setAnnotationDraft] = React.useState("")

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
  const spaceOptions = React.useMemo(
    () => writableSpaces.map((s) => ({ value: s.id, label: s.name })),
    [writableSpaces],
  )
  const formatOptions = React.useMemo(
    () => FORMATS.map((f) => ({ value: f, label: f.replaceAll("_", " ") })),
    [],
  )
  const visibilityOptions = React.useMemo(
    () => VISIBILITIES.map((v) => ({ value: v, label: v === "members_only" ? "Members only" : "Public" })),
    [],
  )
  const blockTypeOptions = React.useMemo(
    () => BLOCK_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
    [],
  )
  const dealerOptions = React.useMemo(
    () => [
      { value: "N" as const, label: "Dealer: North" },
      { value: "E" as const, label: "Dealer: East" },
      { value: "S" as const, label: "Dealer: South" },
      { value: "W" as const, label: "Dealer: West" },
    ],
    [],
  )
  const vulnerabilityOptions = React.useMemo(
    () => [
      { value: "none" as const, label: "Vul: None" },
      { value: "ns" as const, label: "Vul: NS" },
      { value: "ew" as const, label: "Vul: EW" },
      { value: "all" as const, label: "Vul: All" },
    ],
    [],
  )
  const auctionSeatOptions = React.useMemo(
    () => AUCTION_SEATS.map((s) => ({ value: s, label: `Start: ${s}` })),
    [],
  )
  const auctionLevelOptions = React.useMemo(
    () => AUCTION_LEVELS.map((l) => ({ value: l, label: `Level ${l}` })),
    [],
  )
  const linkTypeOptions = React.useMemo(
    () => LINK_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
    [],
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
    setCoverImageUrl(item.coverImageUrl ?? null)
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
      coverImageUrl: coverImageUrl || null,
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
    [spaceId, title, summary, coverImageUrl, format, visibility, tagsInput, links, blocks],
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

  const [attempted, setAttempted] = React.useState(false)
  const [tagDraft, setTagDraft] = React.useState("")

  const SAVE_STATE_DOT: Record<string, string> = {
    idle: "bg-[#9ca3af]",
    dirty: "bg-amber-400",
    saving: "bg-amber-400 animate-pulse",
    saved: "bg-emerald-400",
    error: "bg-red-400",
  }
  const inputClass = "h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"

  const parsedTags = React.useMemo(() => parseTags(tagsInput), [tagsInput])
  const removeTag = React.useCallback((tag: string) => {
    setTagsInput((prev) => parseTags(prev).filter((t) => t !== tag).join(", "))
    setDirty()
  }, [setDirty])
  const addTag = React.useCallback((raw: string) => {
    const tag = raw.trim()
    if (!tag) return
    setTagsInput((prev) => {
      const existing = parseTags(prev)
      if (existing.includes(tag)) return prev
      return [...existing, tag].join(", ")
    })
    setTagDraft("")
    setDirty()
  }, [setDirty])

  const BLOCK_TYPE_ICON: Record<string, React.ReactNode> = {
    text: <AlignLeftIcon className="size-3.5" />,
    callout: <InfoIcon className="size-3.5" />,
    deal: <LayoutGridIcon className="size-3.5" />,
    auction: <GavelIcon className="size-3.5" />,
    question: <HelpCircleIcon className="size-3.5" />,
    answer: <MessageSquareIcon className="size-3.5" />,
    image: <ImageIcon className="size-3.5" />,
  }

  const uploadFile = React.useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/content/upload", { method: "POST", body: formData })
      if (!res.ok) { const err = await res.json().catch(() => null); setMessage(err?.message ?? "Upload failed"); return null }
      const data = await res.json()
      return data.url
    } catch { setMessage("Upload failed"); return null }
  }, [])

  const insertSuitAtCursor = React.useCallback((selector: string, suit: string, blockIndex: number, currentBlock: ContentBlock) => {
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    const val = el.value
    const next = val.slice(0, start) + suit + val.slice(end)
    const key = currentBlock.type === "text" ? "markdown" : currentBlock.type === "callout" ? "text" : currentBlock.type === "question" ? "question" : "text"
    setBlocks((prev) => prev.map((v, i) => i === blockIndex ? { ...currentBlock, [key]: next } : v))
    setDirty()
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + suit.length, start + suit.length) })
  }, [setDirty])

  const SUIT_TOOLBAR = [["♠", "text-[#2b3446]"], ["♥", "text-[#9e2d36]"], ["♦", "text-[#b7692f]"], ["♣", "text-[#2f6a4a]"]] as const

  const wrappedSave = React.useCallback(() => {
    setAttempted(true)
    save()
  }, [save])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/content" className="rounded-md p-1 text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151]">
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9ca3af]">
            <span className={`size-1.5 rounded-full ${SAVE_STATE_DOT[saveState] ?? "bg-[#9ca3af]"}`} />
            {saveState}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={wrappedSave} disabled={busy} className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#1f2734] px-2.5 text-[11px] font-medium text-white transition hover:bg-[#374151] disabled:opacity-50">
            {busy ? <LoaderCircleIcon className="size-3 animate-spin" /> : <SaveIcon className="size-3" />}
            Save
          </button>
          {isEdit && contentId ? (
            <>
              <button type="button" onClick={publish} disabled={!canPublish || busy} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40">
                <SendIcon className="size-3" /> Publish
              </button>
              <button type="button" onClick={archive} disabled={!canArchive || busy} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#e5e7eb] px-2.5 text-[11px] font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] disabled:opacity-40">
                <ArchiveIcon className="size-3" /> Archive
              </button>
              {format === "deal_analysis" ? (
                <Link href={`/dashboard/content/${encodeURIComponent(contentId)}/study`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#e5e7eb] px-2.5 text-[11px] font-medium text-[#374151] transition hover:bg-[#f3f4f6]">
                  Studio
                </Link>
              ) : null}
              <Link href={`/dashboard/content/${encodeURIComponent(contentId)}`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#e5e7eb] px-2.5 text-[11px] font-medium text-[#374151] transition hover:bg-[#f3f4f6]">
                <EyeIcon className="size-3" /> View
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Hero: Title + Summary ── */}
      <section>
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty() }}
          placeholder="Untitled"
          className="w-full border-0 bg-transparent text-[28px] font-bold leading-tight text-[#1f2734] placeholder:text-[#d1d5db] focus:outline-none"
        />
        <textarea
          value={summary}
          onChange={(e) => { setSummary(e.target.value); setDirty() }}
          rows={1}
          placeholder="Add a summary..."
          className="mt-1 w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-[#6b7280] placeholder:text-[#d1d5db] focus:outline-none"
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = "auto"
            el.style.height = `${el.scrollHeight}px`
          }}
        />

        {/* Cover image */}
        <div className="mt-3">
          {coverImageUrl ? (
            <div className="group relative overflow-hidden rounded-lg">
              <img src={coverImageUrl} alt="Cover" className="h-40 w-full object-cover" />
              <button
                type="button"
                onClick={() => { setCoverImageUrl(null); setDirty() }}
                className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={coverUploading}
              onClick={() => {
                const inp = document.createElement("input")
                inp.type = "file"
                inp.accept = "image/jpeg,image/png,image/gif,image/webp"
                inp.onchange = async () => {
                  const file = inp.files?.[0]
                  if (!file) return
                  setCoverUploading(true)
                  const url = await uploadFile(file)
                  setCoverUploading(false)
                  if (url) { setCoverImageUrl(url); setDirty() }
                }
                inp.click()
              }}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-[#d1d5db] px-3 py-1.5 text-xs text-[#9ca3af] transition hover:border-[#6b7280] hover:text-[#6b7280]"
            >
              {coverUploading ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
              {coverUploading ? "Uploading..." : "Add cover image"}
            </button>
          )}
        </div>

        {/* Metadata pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <FormSelect value={spaceId} onChange={(v) => { setSpaceId(v); setDirty() }} options={spaceOptions} placeholder="Space" disabled={isEdit} />
          <FormSelect value={format} onChange={(v) => { setFormat(v as ContentFormat); setDirty() }} options={formatOptions} />
          <FormSelect value={visibility} onChange={(v) => { setVisibility(v as ContentVisibility); setDirty() }} options={visibilityOptions} />
        </div>

        {/* Tags as chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {parsedTags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] py-0.5 pl-2 pr-1 text-xs text-[#374151]">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} className="rounded-full p-0.5 text-[#9ca3af] transition hover:bg-[#e5e7eb] hover:text-[#374151]">
                <XIcon className="size-2.5" />
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagDraft) }
              if (e.key === "Backspace" && !tagDraft && parsedTags.length > 0) {
                removeTag(parsedTags[parsedTags.length - 1])
              }
            }}
            onBlur={() => addTag(tagDraft)}
            placeholder={parsedTags.length === 0 ? "Add tags..." : "+"}
            className="h-6 min-w-[60px] max-w-[160px] flex-1 border-0 bg-transparent text-xs text-[#374151] placeholder:text-[#c0c5ce] focus:outline-none"
          />
        </div>

        {/* Errors — only after save attempt */}
        {hiddenPublicConflict ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Hidden space cannot publish public content.</p> : null}
        {attempted && validation.length > 0 ? <p className="mt-3 text-xs text-red-500">{validation[0]}</p> : null}
        {error ? <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-500"><AlertCircleIcon className="size-3" />{error}</p> : null}
        {message ? <p className="mt-2 text-xs text-emerald-600">{message}</p> : null}
      </section>

      {/* ── Content blocks ── */}
      <hr className="border-[#f0f0f0]" />
      <section>
        <div className="flex items-center justify-between gap-2 border-b border-[#e5e7eb]">
          <div className="flex">
            <button type="button" onClick={() => setTab("edit")} className={`h-9 border-b-2 px-3 text-xs font-semibold uppercase tracking-wide transition ${tab === "edit" ? "border-[#1f2734] text-[#1f2734]" : "border-transparent text-[#9ca3af] hover:text-[#374151]"}`}>Edit</button>
            <button type="button" onClick={() => setTab("preview")} className={`h-9 border-b-2 px-3 text-xs font-semibold uppercase tracking-wide transition ${tab === "preview" ? "border-[#1f2734] text-[#1f2734]" : "border-transparent text-[#9ca3af] hover:text-[#374151]"}`}>Preview</button>
          </div>
          {tab === "edit" ? (
            <div className="flex items-center gap-1">
              {BLOCK_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setBlocks((prev) => [...prev, defaultBlock(t)]); setDirty() }}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151]"
                >
                  <PlusIcon className="size-3" />
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {tab === "preview" ? (
          <div className="mx-auto mt-6 max-w-3xl space-y-0">
            {blocks.map((block, index) => (
              <ContentBlockRenderer key={`preview-${block.type}-${index}`} block={block} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {blocks.map((block, index) => (
              <article key={`${block.type}-${index}`} className="group/block rounded-lg border border-[#e5e7eb] bg-white p-3 transition hover:border-[#d1d5db]">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[#9ca3af]">
                    {BLOCK_TYPE_ICON[block.type] ?? null}
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">{block.type}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/block:opacity-100 focus-within:opacity-100">
                    <button type="button" onClick={() => { if (index === 0) return; setBlocks((prev) => { const next = [...prev]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next }); setDirty() }} className="inline-flex size-6 items-center justify-center rounded text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151] disabled:opacity-40" disabled={index === 0}><ArrowUpIcon className="size-3" /></button>
                    <button type="button" onClick={() => { if (index === blocks.length - 1) return; setBlocks((prev) => { const next = [...prev]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next }); setDirty() }} className="inline-flex size-6 items-center justify-center rounded text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151] disabled:opacity-40" disabled={index === blocks.length - 1}><ArrowDownIcon className="size-3" /></button>
                    <button type="button" onClick={() => { if (blocks.length === 1) return; setBlocks((prev) => prev.filter((_, current) => current !== index)); setDirty() }} className="inline-flex size-6 items-center justify-center rounded text-[#9ca3af] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40" disabled={blocks.length === 1}><Trash2Icon className="size-3" /></button>
                  </div>
                </div>

                {block.type === "text" ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-0.5 pb-1">
                      {([["♠", "text-[#2b3446]"], ["♥", "text-[#9e2d36]"], ["♦", "text-[#b7692f]"], ["♣", "text-[#2f6a4a]"]] as const).map(([sym, color]) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => {
                            const ta = document.querySelector<HTMLTextAreaElement>(`[data-text-block="${index}"]`)
                            if (!ta) return
                            const start = ta.selectionStart
                            const end = ta.selectionEnd
                            const val = ta.value
                            const next = val.slice(0, start) + sym + val.slice(end)
                            setBlocks((prev) => prev.map((v, i) => i === index ? { ...block, markdown: next } : v))
                            setDirty()
                            requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + sym.length, start + sym.length) })
                          }}
                          className={`inline-flex size-6 items-center justify-center rounded text-sm font-bold transition hover:bg-[#f3f4f6] ${color}`}
                        >
                          {sym}
                        </button>
                      ))}
                      <span className="mx-1 h-4 w-px bg-[#e5e7eb]" />
                      {([["**B**", "font-bold", "B"], ["*I*", "italic", "I"]] as const).map(([insert, cls, label]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            const ta = document.querySelector<HTMLTextAreaElement>(`[data-text-block="${index}"]`)
                            if (!ta) return
                            const start = ta.selectionStart
                            const end = ta.selectionEnd
                            const val = ta.value
                            const selected = val.slice(start, end)
                            const wrap = insert === "**B**" ? `**${selected || "text"}**` : `*${selected || "text"}*`
                            const next = val.slice(0, start) + wrap + val.slice(end)
                            setBlocks((prev) => prev.map((v, i) => i === index ? { ...block, markdown: next } : v))
                            setDirty()
                            requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + (insert === "**B**" ? 2 : 1), start + wrap.length - (insert === "**B**" ? 2 : 1)) })
                          }}
                          className={`inline-flex size-6 items-center justify-center rounded text-[11px] text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#1f2734] ${cls}`}
                        >
                          {label}
                        </button>
                      ))}
                      <span className="mx-1 h-4 w-px bg-[#e5e7eb]" />
                      <button
                        type="button"
                        onClick={() => {
                          const ta = document.querySelector<HTMLTextAreaElement>(`[data-text-block="${index}"]`)
                          if (!ta) return
                          const start = ta.selectionStart
                          const end = ta.selectionEnd
                          const val = ta.value
                          const selected = val.slice(start, end)
                          if (selected) {
                            const bulleted = selected.split("\n").map(line => line.startsWith("- ") ? line : `- ${line}`).join("\n")
                            const next = val.slice(0, start) + bulleted + val.slice(end)
                            setBlocks((prev) => prev.map((v, i) => i === index ? { ...block, markdown: next } : v))
                            setDirty()
                            requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start, start + bulleted.length) })
                          } else {
                            const lineStart = val.lastIndexOf("\n", start - 1) + 1
                            const next = val.slice(0, lineStart) + "- " + val.slice(lineStart)
                            setBlocks((prev) => prev.map((v, i) => i === index ? { ...block, markdown: next } : v))
                            setDirty()
                            requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2) })
                          }
                        }}
                        className="inline-flex size-6 items-center justify-center rounded text-[11px] text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#1f2734]"
                        title="Bullet list"
                      >
                        •
                      </button>
                    </div>
                    <textarea data-text-block={index} value={block.markdown} onChange={(e) => { setBlocks((prev) => prev.map((value, current) => current === index ? { ...block, markdown: e.target.value } : value)); setDirty() }} rows={4} className="w-full rounded-md border border-[#e5e7eb] bg-[#fafbfc] px-3 py-2 text-[13px] leading-relaxed text-[#1f2734] font-[inherit] transition focus:border-[#6b7280] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20" placeholder="Write in markdown — **bold**, *italic*, suit symbols ♠♥♦♣, # headings..." />
                  </div>
                ) : null}
                {block.type === "callout" ? (
                  <div className="mt-2 flex items-center gap-1">
                    {SUIT_TOOLBAR.map(([sym, color]) => (
                      <button key={sym} type="button" onClick={() => insertSuitAtCursor(`[data-callout-block="${index}"]`, sym, index, block)} className={`inline-flex size-5 items-center justify-center rounded text-xs font-bold transition hover:bg-[#f3f4f6] ${color}`}>{sym}</button>
                    ))}
                    <input data-callout-block={index} value={block.text} onChange={(e) => { setBlocks((prev) => prev.map((value, current) => current === index ? { ...block, text: e.target.value } : value)); setDirty() }} className={`${inputClass}`} placeholder="Callout text" />
                  </div>
                ) : null}
                {block.type === "deal" ? (() => {
                  const dealBlock = block as DealBlock
                  const dealMode: "hands" | "link" = dealBlock.hands === undefined ? "link" : "hands"
                  const normalizedHands = normalizeDealHands(dealBlock.hands)

                  return (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-2 md:grid-cols-3">
                        <input
                          value={dealBlock.board ?? ""}
                          onChange={(e) => updateBlockAt(index, { ...dealBlock, board: e.target.value })}
                          className={inputClass}
                          placeholder="Board (optional)"
                        />
                        <FormSelect
                          value={(dealBlock.dealer ?? "N") as "N" | "E" | "S" | "W"}
                          onChange={(v) => updateBlockAt(index, { ...dealBlock, dealer: v as "N" | "E" | "S" | "W" })}
                          options={dealerOptions}
                        />
                        <FormSelect
                          value={(dealBlock.vulnerability ?? "none") as "none" | "ns" | "ew" | "all"}
                          onChange={(v) => updateBlockAt(index, { ...dealBlock, vulnerability: v as "none" | "ns" | "ew" | "all" })}
                          options={vulnerabilityOptions}
                        />
                      </div>

                      <div className="flex border-b border-[#e5e7eb]">
                        <button
                          type="button"
                          onClick={() => updateBlockAt(index, { ...dealBlock, hands: normalizedHands })}
                          className={`h-9 border-b-2 px-3 text-sm font-medium transition ${dealMode === "hands" ? "border-[#1f2734] text-[#1f2734]" : "border-transparent text-[#6b7280] hover:text-[#374151]"}`}
                        >
                          Hands layout
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBlockAt(index, { ...dealBlock, hands: undefined })}
                          className={`h-9 border-b-2 px-3 text-sm font-medium transition ${dealMode === "link" ? "border-[#1f2734] text-[#1f2734]" : "border-transparent text-[#6b7280] hover:text-[#374151]"}`}
                        >
                          Deal link
                        </button>
                      </div>

                      {dealMode === "link" ? (
                        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                          <input
                            value={dealBlock.sourceUrl ?? ""}
                            onChange={(e) => updateBlockAt(index, { ...dealBlock, sourceUrl: e.target.value, hands: undefined })}
                            className={inputClass}
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
                            className="inline-flex h-9 items-center rounded-lg bg-[#1f2734] px-3 text-sm font-medium text-white transition hover:bg-[#374151]"
                          >
                            Parse link
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid gap-2 lg:grid-cols-2">
                            {DEAL_SEATS.map((seat) => {
                              const hand = normalizedHands[seat]
                              return (
                                <article key={seat} className="rounded-lg border border-[#e5e7eb] bg-white p-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#6b7280]">{DEAL_SEAT_LABELS[seat]}</p>
                                  <div className="mt-1.5 space-y-1.5">
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
                                          className="h-8 rounded-md border border-[#e5e7eb] bg-white px-2 text-sm text-[#1f2734] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
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
                            className={inputClass}
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
                    <div className="mt-3 space-y-3">
                      {/* Bidding toolbar: seat selector + level + suits + special + actions */}
                      <div className="flex flex-wrap items-center gap-1">
                        {/* Starting seat */}
                        <div className="flex items-center rounded-md border border-[#e5e7eb] bg-[#f9fafb]">
                          {AUCTION_SEATS.map((s) => (
                            <button
                              key={`start-${s}`}
                              type="button"
                              onClick={() => updateBlockAt(index, { ...auctionBlock, startingSeat: s as AuctionSeat, sequence: normalizedSequence })}
                              className={`h-7 w-7 text-[11px] font-semibold transition first:rounded-l-md last:rounded-r-md ${
                                startingSeat === s ? "bg-[#1f2734] text-white" : "text-[#6b7280] hover:bg-[#e5e7eb]"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>

                        {/* Vulnerability */}
                        <div className="flex items-center rounded-md border border-[#e5e7eb] bg-[#f9fafb]">
                          {(["none", "ns", "ew", "all"] as const).map((v) => {
                            const vul = auctionBlock.vulnerability ?? "none"
                            const labels: Record<string, string> = { none: "—", ns: "NS", ew: "EW", all: "All" }
                            return (
                              <button
                                key={`vul-${v}`}
                                type="button"
                                onClick={() => updateBlockAt(index, { ...auctionBlock, vulnerability: v, sequence: normalizedSequence, startingSeat })}
                                className={`h-7 px-1.5 text-[10px] font-semibold transition first:rounded-l-md last:rounded-r-md ${
                                  vul === v
                                    ? v === "none" ? "bg-[#1f2734] text-white" : "bg-[#dc2626] text-white"
                                    : "text-[#6b7280] hover:bg-[#e5e7eb]"
                                }`}
                              >
                                {labels[v]}
                              </button>
                            )
                          })}
                        </div>

                        <span className="mx-0.5 h-5 w-px bg-[#e5e7eb]" />

                        {/* Level selector */}
                        <div className="flex items-center rounded-md border border-[#e5e7eb] bg-[#f9fafb]">
                          {AUCTION_LEVELS.map((l) => (
                            <button
                              key={`lvl-${l}`}
                              type="button"
                              onClick={() => setAuctionDraftLevel(l)}
                              className={`h-7 w-6 text-[11px] font-semibold transition first:rounded-l-md last:rounded-r-md ${
                                auctionDraftLevel === l ? "bg-[#1f2734] text-white" : "text-[#6b7280] hover:bg-[#e5e7eb]"
                              }`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>

                        <span className="mx-0.5 h-5 w-px bg-[#e5e7eb]" />

                        {/* Suit buttons with colors */}
                        {AUCTION_DENOMS.map((denom) => {
                          const colors = AUCTION_DENOM_COLORS[denom]
                          return (
                            <button
                              key={`${index}-${denom}`}
                              type="button"
                              onClick={() => pushCall(`${auctionDraftLevel}${denom}`)}
                              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-bold transition hover:opacity-80 ${colors.bg} ${colors.text}`}
                            >
                              {AUCTION_DENOM_LABELS[denom]}
                            </button>
                          )
                        })}

                        <span className="mx-0.5 h-5 w-px bg-[#e5e7eb]" />

                        {/* Pass / X / XX */}
                        <button type="button" onClick={() => pushCall("P")} className="inline-flex h-7 items-center rounded-md border border-[#e5e7eb] bg-white px-2 text-[11px] font-medium text-[#374151] transition hover:bg-[#f3f4f6]">Pass</button>
                        <button type="button" onClick={() => pushCall("X")} className="inline-flex h-7 items-center rounded-md border border-[#e5e7eb] bg-white px-1.5 text-[11px] font-bold text-red-500 transition hover:bg-red-50">X</button>
                        <button type="button" onClick={() => pushCall("XX")} className="inline-flex h-7 items-center rounded-md border border-[#e5e7eb] bg-white px-1.5 text-[11px] font-bold text-blue-500 transition hover:bg-blue-50">XX</button>

                        {/* Spacer + Next seat + Undo/Clear */}
                        <span className="flex-1" />
                        <span className="text-[10px] text-[#9ca3af]">next: <span className="font-semibold text-[#1f2734]">{nextSeat}</span></span>
                        <button
                          type="button"
                          onClick={() => { const ns = normalizedSequence.slice(0, -1); updateBlockAt(index, { ...auctionBlock, startingSeat, sequence: ns }); setAuctionManualDrafts((prev) => ({ ...prev, [index]: ns.join(" ") })) }}
                          className="inline-flex size-6 items-center justify-center rounded text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151] disabled:opacity-30"
                          disabled={normalizedSequence.length === 0}
                        >
                          <RotateCcwIcon className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { updateBlockAt(index, { ...auctionBlock, startingSeat, sequence: [] }); setAuctionManualDrafts((prev) => ({ ...prev, [index]: "" })) }}
                          className="inline-flex size-6 items-center justify-center rounded text-[#9ca3af] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                          disabled={normalizedSequence.length === 0}
                        >
                          <Trash2Icon className="size-3" />
                        </button>
                      </div>

                      {/* Auction table */}
                      {(() => {
                        const annotations = (auctionBlock.annotations ?? {}) as Record<string, string>
                        // Build ordered footnote map: callIndex → footnoteNumber
                        const annotatedIndices = Object.keys(annotations).map(Number).filter((i) => !isNaN(i) && annotations[String(i)]?.trim()).sort((a, b) => a - b)
                        const footnoteMap = new Map(annotatedIndices.map((ci, fi) => [ci, fi + 1]))

                        // Map table cells to their original call index
                        const startIdx = AUCTION_SEATS.indexOf(startingSeat)
                        const paddingCount = startIdx < 0 ? 0 : startIdx
                        const vul = auctionBlock.vulnerability ?? "none"
                        const isVulSeat = (seat: string) => {
                          if (vul === "all") return true
                          if (vul === "ns") return seat === "N" || seat === "S"
                          if (vul === "ew") return seat === "E" || seat === "W"
                          return false
                        }

                        return auctionRows.length > 0 ? (
                          <>
                            <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="bg-[#f9fafb]">
                                    {AUCTION_SEATS.map((seat) => (
                                      <th key={`${index}-h-${seat}`} className={`border-b border-[#e5e7eb] px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide ${isVulSeat(seat) ? "bg-[#fef2f2] text-[#dc2626]" : seat === nextSeat ? "text-[#1f2734]" : "text-[#9ca3af]"}`}>{seat}{isVulSeat(seat) ? <span className="ml-0.5 text-[8px] font-normal">vul</span> : null}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {auctionRows.map((row, ri) => (
                                    <tr key={`${index}-r-${ri}`} className={ri % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}>
                                      {row.map((cell, ci) => {
                                        const flatIdx = ri * AUCTION_SEATS.length + ci
                                        const callIdx = flatIdx - paddingCount
                                        const isCall = callIdx >= 0 && callIdx < normalizedSequence.length
                                        const fn = isCall ? footnoteMap.get(callIdx) : undefined
                                        return (
                                          <td
                                            key={`${index}-c-${ri}-${ci}`}
                                            className={`border-t border-[#f0f0f0] px-2 py-1.5 text-center text-[13px] ${isVulSeat(AUCTION_SEATS[ci]) ? "bg-[#fef2f2]/50" : ""} ${isCall ? "cursor-pointer transition hover:bg-[#f0f0ff]" : ""}`}
                                            onClick={isCall ? () => {
                                              setEditingAnnotation({ blockIndex: index, callIndex: callIdx })
                                              setAnnotationDraft(annotations[String(callIdx)] ?? "")
                                            } : undefined}
                                          >
                                            {renderAuctionCall(cell, fn)}
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Inline annotation editor */}
                            {editingAnnotation?.blockIndex === index ? (() => {
                              const ci = editingAnnotation.callIndex
                              const call = normalizedSequence[ci]
                              const commitAnnotation = () => {
                                const next = { ...annotations }
                                if (annotationDraft.trim()) next[String(ci)] = annotationDraft.trim()
                                else delete next[String(ci)]
                                updateBlockAt(index, { ...auctionBlock, annotations: next, sequence: normalizedSequence, startingSeat })
                                setEditingAnnotation(null)
                                setAnnotationDraft("")
                              }
                              return (
                                <div className="flex items-center gap-2 rounded-md border border-[#6366f1]/30 bg-[#6366f1]/5 px-2.5 py-1.5">
                                  <span className="shrink-0 text-xs font-medium text-[#6366f1]">{renderAuctionCall(call)}</span>
                                  <input
                                    autoFocus
                                    value={annotationDraft}
                                    onChange={(e) => setAnnotationDraft(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitAnnotation() } if (e.key === "Escape") { setEditingAnnotation(null); setAnnotationDraft("") } }}
                                    onBlur={commitAnnotation}
                                    className="h-6 flex-1 border-0 bg-transparent text-xs text-[#1f2734] placeholder:text-[#9ca3af] focus:outline-none"
                                    placeholder="Describe this bid..."
                                  />
                                  <span className="shrink-0 text-[10px] text-[#9ca3af]">Enter to save, Esc to cancel</span>
                                </div>
                              )
                            })() : null}

                            {/* Footnotes */}
                            {annotatedIndices.length > 0 ? (
                              <div className="space-y-0.5 border-t border-dashed border-[#e5e7eb] pt-2">
                                {annotatedIndices.map((ci) => {
                                  const fn = footnoteMap.get(ci)!
                                  const call = normalizedSequence[ci]
                                  return (
                                    <div key={ci} className="group/fn flex items-start gap-1.5 text-xs">
                                      <span className="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/10 text-[9px] font-bold text-[#6366f1]">{fn}</span>
                                      <button
                                        type="button"
                                        onClick={() => { setEditingAnnotation({ blockIndex: index, callIndex: ci }); setAnnotationDraft(annotations[String(ci)] ?? "") }}
                                        className="text-left text-[#6b7280] transition hover:text-[#1f2734]"
                                      >
                                        {renderAuctionCall(call)} — {annotations[String(ci)]}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = { ...annotations }
                                          delete next[String(ci)]
                                          updateBlockAt(index, { ...auctionBlock, annotations: next, sequence: normalizedSequence, startingSeat })
                                        }}
                                        className="ml-auto shrink-0 rounded p-0.5 text-[#c0c5ce] opacity-0 transition group-hover/fn:opacity-100 hover:bg-red-50 hover:text-red-400"
                                      >
                                        <XIcon className="size-3" />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-xs text-[#c0c5ce]">No calls yet</p>
                        )
                      })()}

                      <input
                        value={auctionBlock.notes ?? ""}
                        onChange={(e) => updateBlockAt(index, { ...auctionBlock, notes: e.target.value, sequence: normalizedSequence, startingSeat })}
                        className={`${inputClass} h-7 text-xs`}
                        placeholder="Notes (optional)"
                      />
                    </div>
                  )
                })() : null}
                {block.type === "question" ? (() => {
                  const qBlock = block as ContentBlock & { type: "question"; question: string; options?: string[] }
                  const options = qBlock.options ?? []
                  return (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-1">
                        {SUIT_TOOLBAR.map(([sym, color]) => (
                          <button key={sym} type="button" onClick={() => insertSuitAtCursor(`[data-question-block="${index}"]`, sym, index, block)} className={`inline-flex size-5 items-center justify-center rounded text-xs font-bold transition hover:bg-[#f3f4f6] ${color}`}>{sym}</button>
                        ))}
                        <input data-question-block={index} value={qBlock.question} onChange={(e) => { setBlocks((prev) => prev.map((v, i) => i === index ? { ...qBlock, question: e.target.value } : v)); setDirty() }} className={`${inputClass}`} placeholder="Question text" />
                      </div>
                      <div className="space-y-1">
                        {options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1.5">
                            <span className="w-4 text-right text-[10px] font-semibold text-[#9ca3af]">{String.fromCharCode(97 + oi)}.</span>
                            {SUIT_TOOLBAR.map(([sym, color]) => (
                              <button key={sym} type="button" onClick={() => {
                                const el = document.querySelector<HTMLInputElement>(`[data-question-opt="${index}-${oi}"]`)
                                if (!el) return
                                const s = el.selectionStart ?? el.value.length
                                const e = el.selectionEnd ?? s
                                const newOpts = [...options]; newOpts[oi] = el.value.slice(0, s) + sym + el.value.slice(e)
                                setBlocks((prev) => prev.map((v, i) => i === index ? { ...qBlock, options: newOpts } : v)); setDirty()
                                requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + sym.length, s + sym.length) })
                              }} className={`inline-flex size-4 items-center justify-center rounded text-[10px] font-bold transition hover:bg-[#f3f4f6] ${color}`}>{sym}</button>
                            ))}
                            <input
                              data-question-opt={`${index}-${oi}`}
                              value={opt}
                              onChange={(e) => { const newOpts = [...options]; newOpts[oi] = e.target.value; setBlocks((prev) => prev.map((v, i) => i === index ? { ...qBlock, options: newOpts } : v)); setDirty() }}
                              className="flex-1 rounded border border-[#e5e7eb] bg-[#fafbfc] px-2 py-1 text-[12px] text-[#1f2734] transition focus:border-[#6b7280] focus:bg-white focus:outline-none"
                              placeholder={`Option ${String.fromCharCode(97 + oi)}`}
                            />
                            <button type="button" onClick={() => { const newOpts = options.filter((_, j) => j !== oi); setBlocks((prev) => prev.map((v, i) => i === index ? { ...qBlock, options: newOpts.length ? newOpts : undefined } : v)); setDirty() }} className="inline-flex size-5 items-center justify-center rounded text-[10px] text-[#c0c5ce] transition hover:bg-red-50 hover:text-red-400">✕</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => { setBlocks((prev) => prev.map((v, i) => i === index ? { ...qBlock, options: [...options, ""] } : v)); setDirty() }} className="text-[11px] text-[#6b7280] transition hover:text-[#1f2734]">+ Add option</button>
                      </div>
                    </div>
                  )
                })() : null}
                {block.type === "answer" ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-0.5 pb-1">
                      {SUIT_TOOLBAR.map(([sym, color]) => (
                        <button key={sym} type="button" onClick={() => insertSuitAtCursor(`[data-answer-block="${index}"]`, sym, index, block)} className={`inline-flex size-5 items-center justify-center rounded text-xs font-bold transition hover:bg-[#f3f4f6] ${color}`}>{sym}</button>
                      ))}
                    </div>
                    <textarea data-answer-block={index} value={block.text} onChange={(e) => { setBlocks((prev) => prev.map((value, current) => current === index ? { ...block, text: e.target.value } : value)); setDirty() }} rows={2} className="w-full rounded-md border border-[#e5e7eb] bg-[#fafbfc] px-3 py-2 text-[13px] text-[#1f2734] transition focus:border-[#6b7280] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20" placeholder="Answer text" />
                  </div>
                ) : null}
                {block.type === "image" ? (() => {
                  const imgBlock = block as ContentBlock & { type: "image"; url: string; alt?: string; caption?: string }
                  return (
                    <div className="mt-2 space-y-2">
                      {imgBlock.url ? (
                        <div className="group relative overflow-hidden rounded-lg">
                          <img src={imgBlock.url} alt={imgBlock.alt || ""} className="max-h-64 w-full object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => { setBlocks((prev) => prev.map((v, i) => i === index ? { ...imgBlock, url: "" } : v)); setDirty() }}
                            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const inp = document.createElement("input")
                            inp.type = "file"
                            inp.accept = "image/jpeg,image/png,image/gif,image/webp"
                            inp.onchange = async () => {
                              const file = inp.files?.[0]
                              if (!file) return
                              const url = await uploadFile(file)
                              if (url) { setBlocks((prev) => prev.map((v, i) => i === index ? { ...imgBlock, url } : v)); setDirty() }
                            }
                            inp.click()
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#d1d5db] py-8 text-sm text-[#9ca3af] transition hover:border-[#6b7280] hover:text-[#6b7280]"
                        >
                          <UploadIcon className="size-4" />
                          Click to upload image
                        </button>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={imgBlock.alt || ""}
                          onChange={(e) => { setBlocks((prev) => prev.map((v, i) => i === index ? { ...imgBlock, alt: e.target.value } : v)); setDirty() }}
                          className={`${inputClass} h-7 flex-1 text-xs`}
                          placeholder="Alt text (for accessibility)"
                        />
                        <input
                          value={imgBlock.caption || ""}
                          onChange={(e) => { setBlocks((prev) => prev.map((v, i) => i === index ? { ...imgBlock, caption: e.target.value } : v)); setDirty() }}
                          className={`${inputClass} h-7 flex-1 text-xs`}
                          placeholder="Caption (optional)"
                        />
                      </div>
                    </div>
                  )
                })() : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-[#e5e7eb] pt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Related links</h2>
          <button type="button" onClick={() => { setLinks((prev) => [...prev, { targetType: "external", targetId: "", url: "", label: "" }]); setDirty() }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e5e7eb] px-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#f3f4f6]">
            <PlusIcon className="size-4" /> Add link
          </button>
        </div>
        <div className="mt-3 divide-y divide-[#f0f0f0]">
          {links.map((link, index) => (
            <div key={`link-${index}`} className="grid gap-2 py-3 first:pt-0 sm:grid-cols-12">
              <div className="sm:col-span-2"><FormSelect value={link.targetType} onChange={(v) => { const value = v as ContentLinkTarget; setLinks((prev) => prev.map((item, current) => current === index ? { ...item, targetType: value } : item)); setDirty() }} options={linkTypeOptions} /></div>
              <input value={link.targetId ?? ""} onChange={(e) => { setLinks((prev) => prev.map((item, current) => current === index ? { ...item, targetId: e.target.value } : item)); setDirty() }} placeholder="Target ID" className={`${inputClass} sm:col-span-3`} />
              <input value={link.url ?? ""} onChange={(e) => { setLinks((prev) => prev.map((item, current) => current === index ? { ...item, url: e.target.value } : item)); setDirty() }} placeholder="URL" className={`${inputClass} sm:col-span-4`} />
              <input value={link.label ?? ""} onChange={(e) => { setLinks((prev) => prev.map((item, current) => current === index ? { ...item, label: e.target.value } : item)); setDirty() }} placeholder="Label" className={`${inputClass} sm:col-span-2`} />
              <button type="button" onClick={() => { setLinks((prev) => prev.filter((_, current) => current !== index)); setDirty() }} className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition hover:bg-red-50 sm:col-span-1"><Trash2Icon className="size-4" /></button>
            </div>
          ))}
          {links.length === 0 ? <p className="mt-2 text-sm text-[#9ca3af]">No links added yet.</p> : null}
        </div>
      </section>
    </div>
  )
}
