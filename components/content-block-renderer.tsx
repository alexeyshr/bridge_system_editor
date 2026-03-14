"use client"

import { ExternalLinkIcon } from "lucide-react"

import { parseBridgeDealSourceUrl } from "@/lib/bridge/deal-source-parser"
import type { ContentBlock } from "@/lib/validation/content"

const DEAL_SEATS = ["north", "east", "south", "west"] as const
const DEAL_SUITS = ["spades", "hearts", "diamonds", "clubs"] as const
const AUCTION_SEATS = ["W", "N", "E", "S"] as const

type DealSeat = (typeof DEAL_SEATS)[number]
type DealSuit = (typeof DEAL_SUITS)[number]
type DealBlock = Extract<ContentBlock, { type: "deal" }>
type DealHand = Partial<Record<DealSuit, string>>
type AuctionSeat = (typeof AUCTION_SEATS)[number]
type AuctionBlock = Extract<ContentBlock, { type: "auction" }>

const DEAL_SEAT_LABELS: Record<DealSeat, string> = {
  north: "North",
  east: "East",
  south: "South",
  west: "West",
}

const DEAL_SUIT_META: Record<DealSuit, { symbol: string; colorClassName: string }> = {
  spades: { symbol: "♠", colorClassName: "text-[#2b3446]" },
  hearts: { symbol: "♥", colorClassName: "text-[#9e2d36]" },
  diamonds: { symbol: "♦", colorClassName: "text-[#b7692f]" },
  clubs: { symbol: "♣", colorClassName: "text-[#2f6a4a]" },
}

function blockLabel(type: ContentBlock["type"]) {
  if (type === "text") return "Text"
  if (type === "callout") return "Callout"
  if (type === "deal") return "Deal"
  if (type === "auction") return "Auction"
  if (type === "question") return "Question"
  return "Answer"
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

function normalizeDealHands(hands: DealBlock["hands"] | undefined): Record<DealSeat, DealHand> {
  return {
    north: normalizeDealHand(hands?.north),
    east: normalizeDealHand(hands?.east),
    south: normalizeDealHand(hands?.south),
    west: normalizeDealHand(hands?.west),
  }
}

function hasHandValues(hand: DealHand) {
  return DEAL_SUITS.some((suit) => Boolean(hand[suit]?.trim()))
}

function vulnerabilityLabel(value: DealBlock["vulnerability"]) {
  if (value === "ns") return "NS"
  if (value === "ew") return "EW"
  if (value === "all") return "All"
  if (value === "none") return "None"
  return "—"
}

function renderDealMeta(value: {
  board?: string
  dealer?: "N" | "E" | "S" | "W"
  vulnerability?: DealBlock["vulnerability"]
}) {
  const items = [
    `Board: ${value.board?.trim() ? value.board : "—"}`,
    `Dealer: ${value.dealer ?? "—"}`,
    `Vul: ${vulnerabilityLabel(value.vulnerability)}`,
  ]
  return items.join(" · ")
}

function buildAuctionRows(startingSeat: AuctionSeat, sequence: string[]): Array<Array<string | null>> {
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

function DealHandCard({ seat, hand, compact }: { seat: DealSeat; hand: DealHand; compact: boolean }) {
  const cardClassName = compact
    ? "rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-2"
    : "rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-2.5"
  const seatClassName = compact
    ? "text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]"
    : "text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]"

  return (
    <article className={cardClassName}>
      <p className={seatClassName}>{DEAL_SEAT_LABELS[seat]}</p>
      <div className="mt-1 space-y-0.5">
        {DEAL_SUITS.map((suit) => (
          <p key={`${seat}-${suit}`} className="flex items-center gap-1.5 text-xs text-[#3b4557]">
            <span className={`w-3 text-sm font-semibold leading-none ${DEAL_SUIT_META[suit].colorClassName}`}>
              {DEAL_SUIT_META[suit].symbol}
            </span>
            <span className="font-medium">{hand[suit]?.trim() || "—"}</span>
          </p>
        ))}
      </div>
    </article>
  )
}

function DealBlockView({ block, compact }: { block: DealBlock; compact: boolean }) {
  const sourceUrl = block.sourceUrl?.trim()
  const parsedFromUrl = sourceUrl ? parseBridgeDealSourceUrl(sourceUrl) : null
  const blockHands = normalizeDealHands(block.hands)
  const hasBlockHands = DEAL_SEATS.some((seat) => hasHandValues(blockHands[seat]))
  const parsedHands = normalizeDealHands(parsedFromUrl?.hands)
  const hasParsedHands = DEAL_SEATS.some((seat) => hasHandValues(parsedHands[seat]))
  const hands = hasBlockHands ? blockHands : hasParsedHands ? parsedHands : blockHands
  const hasHands = hasBlockHands || hasParsedHands
  const board = block.board?.trim() ? block.board : parsedFromUrl?.board
  const dealer = block.dealer ?? parsedFromUrl?.dealer
  const vulnerability = block.vulnerability ?? parsedFromUrl?.vulnerability
  const metaClassName = compact ? "mt-1 text-[12px] text-[#5f6a7b]" : "mt-1 text-sm text-[#5f6a7b]"

  if (!hasHands) {
    return (
      <div className="mt-1 space-y-1.5">
        <p className={metaClassName}>{renderDealMeta({ board, dealer, vulnerability })}</p>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[#d8dbe1] bg-white px-2 py-1 text-xs font-medium text-[#2f466d] hover:bg-[#f8f9fc]"
          >
            <ExternalLinkIcon className="size-3.5" />
            Open deal source
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mt-1 space-y-2">
      <div className={metaClassName}>{renderDealMeta({ board, dealer, vulnerability })}</div>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-[#d8dbe1] bg-white px-2 py-1 text-xs font-medium text-[#2f466d] hover:bg-[#f8f9fc]"
        >
          <ExternalLinkIcon className="size-3.5" />
          Open deal source
        </a>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="sm:col-start-2">
          <DealHandCard seat="north" hand={hands.north} compact={compact} />
        </div>
        <div className="sm:col-start-1">
          <DealHandCard seat="west" hand={hands.west} compact={compact} />
        </div>
        <div className="hidden rounded-lg border border-dashed border-[#d8dbe1] bg-white/70 p-2 text-center sm:flex sm:flex-col sm:items-center sm:justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]">Deal</p>
          <p className="mt-0.5 text-xs text-[#5f6a7b]">
            {dealer ?? "—"} dealer · {vulnerabilityLabel(vulnerability)} vul
          </p>
        </div>
        <div className="sm:col-start-3">
          <DealHandCard seat="east" hand={hands.east} compact={compact} />
        </div>
        <div className="sm:col-start-2">
          <DealHandCard seat="south" hand={hands.south} compact={compact} />
        </div>
      </div>
    </div>
  )
}

export function ContentBlockRenderer({
  block,
  index,
  compact = false,
}: {
  block: ContentBlock
  index: number
  compact?: boolean
}) {
  const cardClassName = compact
    ? "rounded-lg border border-[#d8dbe1] bg-white/85 p-2.5"
    : "rounded-lg border border-[#d8dbe1] bg-white p-3"
  const titleClassName = compact
    ? "text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]"
    : "text-xs font-semibold uppercase tracking-[0.08em] text-[#7a8394]"
  const bodyClassName = compact
    ? "mt-1 text-[13px] leading-snug text-[#2b3446]"
    : "mt-1 text-sm text-[#2b3446]"

  if (block.type === "text") {
    return (
      <article className={cardClassName}>
        <p className={titleClassName}>Text #{index + 1}</p>
        <p className={`${bodyClassName} whitespace-pre-wrap`}>{block.markdown}</p>
      </article>
    )
  }

  if (block.type === "callout") {
    return (
      <article className={cardClassName}>
        <p className={titleClassName}>{`Callout · ${block.tone}`}</p>
        <p className={bodyClassName}>{block.text}</p>
      </article>
    )
  }

  if (block.type === "deal") {
    return (
      <article className={cardClassName}>
        <p className={titleClassName}>Deal</p>
        <DealBlockView block={block} compact={compact} />
      </article>
    )
  }

  if (block.type === "auction") {
    const auctionBlock = block as AuctionBlock
    const startingSeat = auctionBlock.startingSeat ?? "W"
    const sequence = auctionBlock.sequence.map((call) => call.trim()).filter(Boolean)
    const rows = buildAuctionRows(startingSeat, sequence)

    return (
      <article className={cardClassName}>
        <p className={titleClassName}>Auction</p>
        <p className={bodyClassName}>Start: {startingSeat}</p>
        <div className="mt-2 overflow-hidden rounded-lg border border-[#d8dbe1] bg-[#fbfcff]">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-[#f3f6fb] text-[#5f6a7b]">
              <tr>
                {AUCTION_SEATS.map((seat) => (
                  <th key={`auction-head-${seat}`} className="border-b border-[#d8dbe1] px-2 py-1.5 text-center font-semibold">
                    {seat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-center text-[#7a8394]">
                    No calls.
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={`auction-row-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#fbfcff]"}>
                    {row.map((cell, cellIndex) => (
                      <td key={`auction-cell-${rowIndex}-${cellIndex}`} className="border-t border-[#edf0f5] px-2 py-1.5 text-center font-medium text-[#2f466d]">
                        {cell ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sequence.length > 0 ? <p className="mt-1.5 text-xs text-[#6e7788]">{sequence.join(" · ")}</p> : null}
        {auctionBlock.notes ? <p className="mt-1 text-xs text-[#6e7788]">{auctionBlock.notes}</p> : null}
      </article>
    )
  }

  if (block.type === "question") {
    return (
      <article className={cardClassName}>
        <p className={titleClassName}>Question</p>
        <p className={bodyClassName}>{block.question}</p>
        {block.options && block.options.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[#6e7788]">
            {block.options.map((option, optionIndex) => (
              <li key={`${option}-${optionIndex}`}>{option}</li>
            ))}
          </ul>
        ) : null}
      </article>
    )
  }

  return (
    <article className={cardClassName}>
      <p className={titleClassName}>{blockLabel(block.type)}</p>
      <p className={bodyClassName}>{block.text}</p>
    </article>
  )
}
