"use client"

import { ExternalLinkIcon, InfoIcon, AlertTriangleIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react"

import { parseBridgeDealSourceUrl } from "@/lib/bridge/deal-source-parser"
import type { ContentBlock } from "@/lib/validation/content"

const DEAL_SEATS = ["north", "east", "south", "west"] as const
const DEAL_SUITS = ["spades", "hearts", "diamonds", "clubs"] as const
const AUCTION_SEATS = ["W", "N", "E", "S"] as const

type DealSeat = (typeof DEAL_SEATS)[number]
type DealSuit = (typeof DEAL_SUITS)[number]
type DealBlock = Extract<ContentBlock, { type: "deal" }>
type DealHand = Partial<Record<DealSuit, string>>
type AuctionBlock = Extract<ContentBlock, { type: "auction" }> & { annotations?: Record<string, string>; vulnerability?: "none" | "ns" | "ew" | "all" }

const DEAL_SEAT_LABELS: Record<DealSeat, string> = {
  north: "North",
  east: "East",
  south: "South",
  west: "West",
}

const DEAL_SUIT_META: Record<DealSuit, { symbol: string; color: string }> = {
  spades: { symbol: "♠", color: "#1a1a2e" },
  hearts: { symbol: "♥", color: "#c0392b" },
  diamonds: { symbol: "♦", color: "#d4760a" },
  clubs: { symbol: "♣", color: "#1a7a4c" },
}

const CALLOUT_STYLES: Record<string, { border: string; bg: string; text: string; icon: typeof InfoIcon }> = {
  info: { border: "border-blue-200", bg: "bg-blue-50/60", text: "text-blue-800", icon: InfoIcon },
  warning: { border: "border-amber-200", bg: "bg-amber-50/60", text: "text-amber-800", icon: AlertTriangleIcon },
  success: { border: "border-emerald-200", bg: "bg-emerald-50/60", text: "text-emerald-800", icon: CheckCircle2Icon },
  danger: { border: "border-rose-200", bg: "bg-rose-50/60", text: "text-rose-800", icon: AlertCircleIcon },
}

// ── Helpers ──

function normalizeDealHand(value: unknown): DealHand {
  if (!value) return {}
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return {}
    const dotParts = trimmed.split(".").map((part) => part.trim())
    if (dotParts.length === 4) {
      return { spades: dotParts[0] || "", hearts: dotParts[1] || "", diamonds: dotParts[2] || "", clubs: dotParts[3] || "" }
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

function normalizeDealHands(hands: DealBlock["hands"] | undefined): Record<DealSeat, DealHand> {
  return { north: normalizeDealHand(hands?.north), east: normalizeDealHand(hands?.east), south: normalizeDealHand(hands?.south), west: normalizeDealHand(hands?.west) }
}

function hasHandValues(hand: DealHand) {
  return DEAL_SUITS.some((suit) => Boolean(hand[suit]?.trim()))
}

function vulnerabilityLabel(value: DealBlock["vulnerability"]) {
  if (value === "ns") return "N-S"
  if (value === "ew") return "E-W"
  if (value === "all") return "All"
  if (value === "none") return "None"
  return "—"
}

function buildAuctionRows(startingSeat: (typeof AUCTION_SEATS)[number], sequence: string[]): Array<Array<string | null>> {
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

/** Render a bid call with colored suit symbols */
function formatAuctionCall(call: string): React.ReactNode {
  if (!call) return "—"
  const normalized = call.trim()
  if (normalized === "Pass" || normalized === "P") return <span className="text-[#6b7280]">Pass</span>
  if (normalized === "X" || normalized === "Double") return <span className="font-bold text-[#c0392b]">Dbl</span>
  if (normalized === "XX" || normalized === "Redouble") return <span className="font-bold text-[#2563eb]">Rdbl</span>

  // Level + denomination (1C, 2NT, etc.)
  const match = normalized.match(/^(\d)(C|D|H|S|NT)$/i)
  if (match) {
    const level = match[1]
    const denom = match[2].toUpperCase()
    if (denom === "NT") return <span>{level}NT</span>
    const suitMap: Record<string, DealSuit> = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" }
    const suit = suitMap[denom]
    if (suit) {
      const meta = DEAL_SUIT_META[suit]
      return (
        <span>
          {level}<span style={{ color: meta.color }}>{meta.symbol}</span>
        </span>
      )
    }
  }
  return <span>{normalized}</span>
}

// ── Hand display (magazine style) ──

function HandDisplay({ seat, hand }: { seat: DealSeat; hand: DealHand }) {
  return (
    <div className="min-w-[90px]">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280] mb-0.5">
        {DEAL_SEAT_LABELS[seat]}
      </div>
      {DEAL_SUITS.map((suit) => {
        const meta = DEAL_SUIT_META[suit]
        const cards = hand[suit]?.trim()
        return (
          <div key={suit} className="flex items-baseline gap-1 leading-snug">
            <span className="text-sm font-bold" style={{ color: meta.color }}>{meta.symbol}</span>
            <span className="text-[13px] tracking-wide font-medium text-[#1f2734]">{cards || "—"}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Deal diagram (compass layout) ──

function DealDiagram({ block }: { block: DealBlock }) {
  const sourceUrl = block.sourceUrl?.trim()
  const parsedFromUrl = sourceUrl ? parseBridgeDealSourceUrl(sourceUrl) : null
  const blockHands = normalizeDealHands(block.hands)
  const hasBlockHands = DEAL_SEATS.some((seat) => hasHandValues(blockHands[seat]))
  const parsedHands = normalizeDealHands(parsedFromUrl?.hands)
  const hasParsedHands = DEAL_SEATS.some((seat) => hasHandValues(parsedHands[seat]))
  const hands = hasBlockHands ? blockHands : hasParsedHands ? parsedHands : blockHands
  const hasHands = hasBlockHands || hasParsedHands
  const board = (typeof block.board === "string" ? block.board.trim() : block.board) ?? parsedFromUrl?.board
  const dealer = block.dealer ?? parsedFromUrl?.dealer
  const vulnerability = block.vulnerability ?? parsedFromUrl?.vulnerability

  const meta = [
    board && `Board ${board}`,
    dealer && `Dealer: ${dealer}`,
    vulnerability && `Vul: ${vulnerabilityLabel(vulnerability)}`,
  ].filter(Boolean).join("  ·  ")

  if (!hasHands) {
    return (
      <div className="space-y-2">
        {meta && <div className="text-xs text-[#6b7280]">{meta}</div>}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#2563eb] hover:underline">
            <ExternalLinkIcon className="size-3" />
            View in BBO
          </a>
        )}
      </div>
    )
  }

  return (
    <figure className="my-4">
      {meta && (
        <figcaption className="text-xs font-semibold text-[#374151] mb-2 pb-1.5 border-b border-[#e5e7eb]">
          {meta}
        </figcaption>
      )}
      {/* Compass layout */}
      <div className="inline-grid grid-cols-3 gap-x-3 gap-y-0.5">
        {/* Row 1: North */}
        <div />
        <HandDisplay seat="north" hand={hands.north} />
        <div />
        {/* Row 2: West + center + East */}
        <HandDisplay seat="west" hand={hands.west} />
        <div className="flex items-center justify-center">
          {(() => {
            const d = dealer ?? "N"
            const cls = (s: string) =>
              `text-[10px] leading-none ${s === d ? "font-extrabold text-[#1f2734]" : "font-medium text-[#c0c5ce]"}`
            return (
              <div className="relative grid w-12 h-12 grid-cols-3 grid-rows-3 rounded border border-[#d1d5db] bg-[#f9fafb]">
                <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                  <line x1="12" y1="12" x2="36" y2="36" stroke="#e5e7eb" strokeWidth="0.75" />
                  <line x1="36" y1="12" x2="12" y2="36" stroke="#e5e7eb" strokeWidth="0.75" />
                </svg>
                <div />
                <div className="flex items-start justify-center pt-px"><span className={cls("N")}>N</span></div>
                <div />
                <div className="flex items-center justify-start pl-px"><span className={cls("W")}>W</span></div>
                <div />
                <div className="flex items-center justify-end pr-px"><span className={cls("E")}>E</span></div>
                <div />
                <div className="flex items-end justify-center pb-px"><span className={cls("S")}>S</span></div>
                <div />
              </div>
            )
          })()}
        </div>
        <HandDisplay seat="east" hand={hands.east} />
        {/* Row 3: South */}
        <div />
        <HandDisplay seat="south" hand={hands.south} />
        <div />
      </div>
      {sourceUrl && (
        <div className="mt-2">
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#2563eb] hover:underline">
            <ExternalLinkIcon className="size-3" />
            View in BBO
          </a>
        </div>
      )}
    </figure>
  )
}

// ── Auction table (magazine style) ──

function normalizeAuctionCall(call: string): string {
  return call.trim()
    .replace(/^(pass|пас)$/i, "P")
    .replace(/^—$/, "P")
    .replace(/♣/g, "C").replace(/♦/g, "D").replace(/♥/g, "H").replace(/♠/g, "S")
    .replace(/^(\d)бк$/i, "$1NT")
}

function AuctionTable({ block }: { block: AuctionBlock }) {
  const startingSeat = block.startingSeat ?? (block as any).dealer ?? "W"
  const rawSeq: string[] = block.sequence ?? (block as any).bids ?? []
  const sequence = rawSeq.map(normalizeAuctionCall).filter(Boolean)
  const rows = buildAuctionRows(startingSeat, sequence)
  const annotations = (block.annotations ?? {}) as Record<string, string>
  const annotatedIndices = Object.keys(annotations).map(Number).filter((i) => !isNaN(i) && annotations[String(i)]?.trim()).sort((a, b) => a - b)
  const footnoteMap = new Map(annotatedIndices.map((ci, fi) => [ci, fi + 1]))
  const startIdx = AUCTION_SEATS.indexOf(startingSeat)
  const paddingCount = startIdx < 0 ? 0 : startIdx
  const vul = block.vulnerability ?? "none"
  const isVulSeat = (seat: string) => {
    if (vul === "all") return true
    if (vul === "ns") return seat === "N" || seat === "S"
    if (vul === "ew") return seat === "E" || seat === "W"
    return false
  }

  return (
    <figure className="my-4">
      <div className="inline-block">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              {AUCTION_SEATS.map((seat) => (
                <th key={seat} className={`w-14 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest border-b-2 ${isVulSeat(seat) ? "bg-[#fef2f2] text-[#dc2626] border-[#dc2626]" : "text-[#6b7280] border-[#1f2734]"}`}>
                  {seat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-2 text-center text-[#9ca3af] text-xs">No calls</td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => {
                    const flatIdx = rowIndex * AUCTION_SEATS.length + cellIndex
                    const callIdx = flatIdx - paddingCount
                    const fn = callIdx >= 0 && callIdx < sequence.length ? footnoteMap.get(callIdx) : undefined
                    return (
                      <td key={cellIndex} className={`px-2 py-1 text-center text-[13px] border-b border-[#e5e7eb] ${isVulSeat(AUCTION_SEATS[cellIndex]) ? "bg-[#fef2f2]/50" : ""}`}>
                        {cell ? (
                          <>{formatAuctionCall(cell)}{fn ? <sup className="ml-0.5 text-[9px] font-bold text-[#6366f1]">{fn}</sup> : null}</>
                        ) : (
                          <span className="text-[#d1d5db]">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {annotatedIndices.length > 0 ? (
        <div className="mt-2 space-y-0.5">
          {annotatedIndices.map((ci) => {
            const fn = footnoteMap.get(ci)!
            const call = sequence[ci]
            return (
              <div key={ci} className="flex items-start gap-1.5 text-xs text-[#6b7280]">
                <span className="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/10 text-[9px] font-bold text-[#6366f1]">{fn}</span>
                <span>{call ? formatAuctionCall(call) : null} — {annotations[String(ci)]}</span>
              </div>
            )
          })}
        </div>
      ) : null}
      {block.notes && (
        <div className="mt-2 text-xs italic text-[#6b7280]">{block.notes}</div>
      )}
    </figure>
  )
}

// ── Simple markdown-like rendering ──

function renderMarkdownText(text: string): React.ReactNode {
  // Split into paragraphs and render with basic formatting
  const paragraphs = text.split(/\n{2,}/)
  return paragraphs.map((para, i) => {
    const trimmed = para.trim()
    if (!trimmed) return null

    // Heading detection
    if (trimmed.startsWith("### ")) {
      return <h4 key={i} className="text-sm font-bold text-[#1f2734] mt-5 mb-1">{trimmed.slice(4)}</h4>
    }
    if (trimmed.startsWith("## ")) {
      return <h3 key={i} className="text-base font-bold text-[#1f2734] mt-6 mb-2">{trimmed.slice(3)}</h3>
    }
    if (trimmed.startsWith("# ")) {
      return <h2 key={i} className="text-lg font-bold text-[#1f2734] mt-6 mb-2">{trimmed.slice(2)}</h2>
    }

    // List detection
    if (trimmed.split("\n").every((line) => /^[-*]\s/.test(line.trim()) || !line.trim())) {
      const items = trimmed.split("\n").filter((line) => /^[-*]\s/.test(line.trim()))
      return (
        <ul key={i} className="my-2 ml-5 list-disc space-y-0.5 text-[15px] leading-relaxed text-[#374151]">
          {items.map((item, j) => <li key={j}>{renderInlineFormatting(item.replace(/^[-*]\s+/, ""))}</li>)}
        </ul>
      )
    }

    return (
      <p key={i} className="my-2 text-[15px] leading-relaxed text-[#374151]">
        {renderInlineFormatting(trimmed)}
      </p>
    )
  })
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Handle **bold**, *italic*, and suit symbols
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyCounter = 0

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Italic
    const italicMatch = remaining.match(/\*(.+?)\*/)
    // Suit symbols with color
    const suitMatch = remaining.match(/([♠♥♦♣])/)

    const matches = [
      boldMatch && { type: "bold" as const, index: boldMatch.index!, length: boldMatch[0].length, content: boldMatch[1] },
      italicMatch && !boldMatch && { type: "italic" as const, index: italicMatch.index!, length: italicMatch[0].length, content: italicMatch[1] },
      suitMatch && { type: "suit" as const, index: suitMatch.index!, length: 1, content: suitMatch[1] },
    ].filter((m): m is { type: "bold" | "italic" | "suit"; index: number; length: number; content: string } => Boolean(m)).sort((a, b) => a.index - b.index)

    if (matches.length === 0 || !matches[0]) {
      parts.push(remaining)
      break
    }

    const match = matches[0]
    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index))
    }

    if (match.type === "bold") {
      parts.push(<strong key={keyCounter++}>{match.content}</strong>)
    } else if (match.type === "italic") {
      parts.push(<em key={keyCounter++}>{match.content}</em>)
    } else if (match.type === "suit") {
      const suitColors: Record<string, string> = { "♠": "#1a1a2e", "♥": "#c0392b", "♦": "#d4760a", "♣": "#1a7a4c" }
      parts.push(
        <span key={keyCounter++} className="font-bold" style={{ color: suitColors[match.content] ?? "#1a1a2e" }}>
          {match.content}
        </span>
      )
    }

    remaining = remaining.slice(match.index + match.length)
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>
}

// ── Main renderer ──

export function ContentBlockRenderer({
  block,
  index,
  compact = false,
}: {
  block: ContentBlock
  index: number
  compact?: boolean
}) {
  // Text block — rendered as prose, no card wrapper
  if (block.type === "text") {
    if (compact) {
      return (
        <div className="text-[13px] leading-snug text-[#374151] whitespace-pre-wrap">
          {block.markdown}
        </div>
      )
    }
    return <div>{renderMarkdownText(block.markdown)}</div>
  }

  // Callout — styled alert box
  if (block.type === "callout") {
    const style = CALLOUT_STYLES[block.tone] ?? CALLOUT_STYLES.info
    const Icon = style.icon
    return (
      <aside className={`my-4 flex gap-3 rounded-lg border ${style.border} ${style.bg} px-4 py-3`}>
        <Icon className={`size-4 mt-0.5 shrink-0 ${style.text}`} />
        <div className={`text-sm leading-relaxed ${style.text}`}>
          {renderInlineFormatting(block.text)}
        </div>
      </aside>
    )
  }

  // Deal — compass diagram
  if (block.type === "deal") {
    return <DealDiagram block={block} />
  }

  // Auction — clean table
  if (block.type === "auction") {
    return <AuctionTable block={block as AuctionBlock} />
  }

  // Question — styled card
  if (block.type === "question") {
    return (
      <div className="my-4 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280] mb-1">Question</div>
        <p className="text-sm font-medium text-[#1f2734]">{block.question}</p>
        {block.options && block.options.length > 0 && (
          <ol className="mt-2 ml-5 list-[lower-alpha] space-y-0.5 text-sm text-[#374151]">
            {block.options.map((option, i) => <li key={i}>{option}</li>)}
          </ol>
        )}
      </div>
    )
  }

  // Answer — collapsed by default (spoiler)
  if (block.type === "answer") {
    return (
      <details className="group my-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
        <summary className="flex cursor-pointer select-none items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700">
          <svg className="size-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Show answer
        </summary>
        <div className="border-t border-emerald-200 px-4 py-3 text-sm leading-relaxed text-[#374151]">
          {renderInlineFormatting(block.text)}
        </div>
      </details>
    )
  }

  // Image block
  if (block.type === "image") {
    return (
      <figure className="my-6">
        <img
          src={block.url}
          alt={block.alt || ""}
          className="w-full rounded-lg"
          loading="lazy"
        />
        {block.caption ? (
          <figcaption className="mt-2 text-center text-xs text-[#9ca3af] italic">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  return null
}
