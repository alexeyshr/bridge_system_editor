"use client"

import * as React from "react"
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MessageSquareIcon,
  PlusIcon,
  SaveIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  VoteIcon,
} from "lucide-react"

import { parseBridgeDealSourceUrl } from "@/lib/bridge/deal-source-parser"
import { trpc } from "@/lib/trpc/react"

const SEATS = ["W", "N", "E", "S"] as const
const SUITS = ["S", "H", "D", "C"] as const
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const
const VULNERABILITIES = ["none", "ns", "ew", "all"] as const
const DENOMS = ["C", "D", "H", "S", "NT"] as const
const DOUBLED = ["none", "X", "XX"] as const
const ANALYSIS_TABS = ["play", "dd", "narrative"] as const
const POLL_SCOPES = ["general", "auction", "lead", "play"] as const

type Seat = (typeof SEATS)[number]
type Suit = (typeof SUITS)[number]
type Rank = (typeof RANKS)[number]
type Vulnerability = (typeof VULNERABILITIES)[number]
type Denom = (typeof DENOMS)[number]
type AnalysisTab = (typeof ANALYSIS_TABS)[number]
type PollScope = (typeof POLL_SCOPES)[number]

type DealHands = Record<Seat, Record<Suit, string>>
type DealMask = { hiddenSeats: Seat[]; hiddenCards: Array<{ seat: Seat; suit: Suit; rank: string }> }
type PlayCard = { seat: Seat; suit: Suit; rank: string }
type PlayStep = { trickNo: number; leader: Seat; cards: PlayCard[]; winner: Seat | null; note?: string | null }
type DdMatrix = Record<"NS" | "EW", Record<Denom, number>>
type ViewerHands = Record<Seat, Record<Suit, string[]>>
type ViewerFrame = {
  hands: ViewerHands
  trickNo: number
  leader: Seat
  trickCards: PlayCard[]
  nextActor: Seat
  nsTricks: number
  ewTricks: number
}

type StudyPayload = {
  content: { id: string; title: string; summary: string | null; status: string }
  study: {
    board: string | null
    dealer: Seat
    vulnerability: Vulnerability
    contractLevel: number | null
    contractDenom: Denom | null
    declarer: Seat | null
    doubledState: "none" | "X" | "XX"
    resultDelta: number | null
    leadSuit: Suit | null
    leadRank: string | null
    hands: DealHands
    visibilityMask: DealMask
    auctionStartingSeat: Seat
    auctionSequence: string[]
    auctionNotes: string | null
    narrativeMarkdown: string
    playSteps: PlayStep[]
    ddSnapshot: { source: "solver" | "import"; matrix: DdMatrix; par: { text: string } } | null
    comments: Array<{
      id: string
      parentCommentId: string | null
      body: string
      anchor: { type: "auction" | "play" | "general"; ref?: string } | null
      author: { id: string; name: string }
      createdAt: string
    }>
    polls: Array<{
      id: string
      scope: PollScope
      question: string
      isClosed: boolean
      options: Array<{ id: string; label: string; votes: number }>
      totalVotes: number
      userVoteOptionId: string | null
    }>
  }
  capabilities: { canEdit: boolean; canComment: boolean; canVote: boolean; canCreatePoll: boolean; canPublish: boolean }
}

type DraftStudy = Omit<StudyPayload["study"], "playSteps" | "ddSnapshot" | "comments" | "polls">
type PlayDraft = {
  trickNo: number
  leader: Seat
  cards: Record<Seat, { suit: Suit; rank: string }>
  winner: Seat | ""
  note: string
}

const SUIT_META: Record<Suit, { symbol: string; className: string }> = {
  S: { symbol: "♠", className: "text-[#2b3446]" },
  H: { symbol: "♥", className: "text-[#9e2d36]" },
  D: { symbol: "♦", className: "text-[#b7692f]" },
  C: { symbol: "♣", className: "text-[#2f6a4a]" },
}

const SEAT_POS: Record<Seat, string> = {
  N: "md:col-start-2 md:row-start-1",
  W: "md:col-start-1 md:row-start-2",
  E: "md:col-start-3 md:row-start-2",
  S: "md:col-start-2 md:row-start-3",
}

function emptyHands(): DealHands {
  return {
    W: { S: "", H: "", D: "", C: "" },
    N: { S: "", H: "", D: "", C: "" },
    E: { S: "", H: "", D: "", C: "" },
    S: { S: "", H: "", D: "", C: "" },
  }
}

function defaultDd(): DdMatrix {
  return { NS: { C: 0, D: 0, H: 0, S: 0, NT: 0 }, EW: { C: 0, D: 0, H: 0, S: 0, NT: 0 } }
}

function normalizeCards(raw: string): string {
  const set = new Set(
    raw
      .toUpperCase()
      .replace(/10/g, "T")
      .replace(/[^AKQJT98765432X-]/g, "")
      .split("")
      .filter(Boolean),
  )
  const ordered: string[] = RANKS.filter((rank) => set.has(rank))
  if (set.has("X")) ordered.push("X")
  if (set.has("-")) ordered.push("-")
  return ordered.join("")
}

function parseSeatQuick(input: string): Record<Suit, string> {
  const parts = input.split(".")
  if (parts.length !== 4) return { S: normalizeCards(input), H: "", D: "", C: "" }
  return {
    S: normalizeCards(parts[0] ?? ""),
    H: normalizeCards(parts[1] ?? ""),
    D: normalizeCards(parts[2] ?? ""),
    C: normalizeCards(parts[3] ?? ""),
  }
}

function seatQuick(hand: Record<Suit, string>) {
  return `${hand.S}.${hand.H}.${hand.D}.${hand.C}`
}

function toggleCard(cards: string, rank: Rank) {
  const set = new Set(cards.split("").filter(Boolean))
  if (set.has(rank)) set.delete(rank)
  else set.add(rank)
  return RANKS.filter((item) => set.has(item)).join("")
}

function normalizeAuctionCall(raw: string): string | null {
  const value = raw
    .trim()
    .toUpperCase()
    .replace(/[♣]/g, "C")
    .replace(/[♦]/g, "D")
    .replace(/[♥]/g, "H")
    .replace(/[♠]/g, "S")
    .replace(/\s+/g, "")
  if (!value) return null
  if (value === "P" || value === "PASS") return "P"
  if (value === "X" || value === "DBL") return "X"
  if (value === "XX" || value === "RDBL") return "XX"
  const m = value.match(/^([1-7])(C|D|H|S|N|NT)$/)
  if (!m) return null
  return `${m[1]}${m[2] === "N" ? "NT" : m[2]}`
}

function parseAuctionQuick(input: string): string[] {
  return input
    .split(/\s+/)
    .map((token) => normalizeAuctionCall(token))
    .filter((item): item is string => Boolean(item))
}

function nextSeat(start: Seat, offset: number): Seat {
  const idx = SEATS.indexOf(start)
  return SEATS[(idx + offset) % 4] ?? "W"
}

function auctionRows(start: Seat, sequence: string[]): Array<Array<string | null>> {
  const prefix = Array.from({ length: SEATS.indexOf(start) }, () => null)
  const cells = [...prefix, ...sequence]
  if (cells.length === 0) return []
  const rows: Array<Array<string | null>> = []
  for (let i = 0; i < cells.length; i += 4) {
    const row = cells.slice(i, i + 4)
    while (row.length < 4) row.push(null)
    rows.push(row)
  }
  return rows
}

function validateHands(hands: DealHands): string[] {
  const seen = new Set<string>()
  const errors: string[] = []
  for (const seat of SEATS) {
    let count = 0
    for (const suit of SUITS) {
      const cards = normalizeCards(hands[seat][suit])
      for (const rank of cards) {
        if (rank === "X" || rank === "-") continue
        count += 1
        const key = `${suit}${rank}`
        if (seen.has(key)) errors.push(`Duplicate card: ${SUIT_META[suit].symbol}${rank}`)
        else seen.add(key)
      }
    }
    if (count > 13) errors.push(`${seat} has more than 13 known cards (${count}).`)
  }
  return errors
}

function validatePlay(steps: PlayStep[]): string[] {
  const errors: string[] = []
  const sorted = [...steps].sort((a, b) => a.trickNo - b.trickNo)
  for (let i = 0; i < sorted.length; i += 1) {
    const step = sorted[i]
    if (step.trickNo !== i + 1) errors.push("Trick numbers must be sequential from 1.")
    if (step.cards.length < 1 || step.cards.length > 4) errors.push(`Trick ${step.trickNo} requires 1-4 cards.`)
    if (i > 0 && sorted[i - 1]?.winner && sorted[i - 1]?.winner !== step.leader) {
      errors.push(`Trick ${step.trickNo} leader must match winner of trick ${step.trickNo - 1}.`)
    }
  }
  return [...new Set(errors)]
}

function toPlayDraft(step: PlayStep | null, fallbackNo: number): PlayDraft {
  const cards: PlayDraft["cards"] = {
    W: { suit: "S", rank: "" },
    N: { suit: "S", rank: "" },
    E: { suit: "S", rank: "" },
    S: { suit: "S", rank: "" },
  }
  if (!step) return { trickNo: fallbackNo, leader: "W", cards, winner: "", note: "" }
  for (const card of step.cards) cards[card.seat] = { suit: card.suit, rank: card.rank }
  return { trickNo: step.trickNo, leader: step.leader, cards, winner: step.winner ?? "", note: step.note ?? "" }
}

function fromPlayDraft(draft: PlayDraft): PlayStep {
  return {
    trickNo: draft.trickNo,
    leader: draft.leader,
    cards: SEATS.map((seat) => ({ seat, suit: draft.cards[seat].suit, rank: draft.cards[seat].rank.trim().toUpperCase() })).filter((c) => c.rank),
    winner: draft.winner || null,
    note: draft.note.trim() || null,
  }
}

function trumpFromDenom(denom: Denom | null): Suit | null {
  if (!denom || denom === "NT") return null
  return denom
}

function rankStrength(rank: string): number {
  const idx = RANKS.indexOf(rank as Rank)
  return idx === -1 ? 99 : idx
}

function normalizePlayCard(card: PlayCard): PlayCard {
  return {
    seat: card.seat,
    suit: card.suit,
    rank: normalizeCards(card.rank).slice(0, 1),
  }
}

function computeTrickWinner(leader: Seat, cards: PlayCard[], denom: Denom | null): Seat | null {
  if (cards.length < 4) return null
  const leadSuit = cards[0]?.suit
  if (!leadSuit) return null
  const trump = trumpFromDenom(denom)
  const candidates = trump ? cards.filter((card) => card.suit === trump) : []
  const pool = candidates.length ? candidates : cards.filter((card) => card.suit === leadSuit)
  if (!pool.length) return leader
  return [...pool].sort((a, b) => rankStrength(a.rank) - rankStrength(b.rank))[0]?.seat ?? leader
}

function cloneViewerHands(hands: DealHands): ViewerHands {
  return {
    W: { S: normalizeCards(hands.W.S).split("").filter(Boolean), H: normalizeCards(hands.W.H).split("").filter(Boolean), D: normalizeCards(hands.W.D).split("").filter(Boolean), C: normalizeCards(hands.W.C).split("").filter(Boolean) },
    N: { S: normalizeCards(hands.N.S).split("").filter(Boolean), H: normalizeCards(hands.N.H).split("").filter(Boolean), D: normalizeCards(hands.N.D).split("").filter(Boolean), C: normalizeCards(hands.N.C).split("").filter(Boolean) },
    E: { S: normalizeCards(hands.E.S).split("").filter(Boolean), H: normalizeCards(hands.E.H).split("").filter(Boolean), D: normalizeCards(hands.E.D).split("").filter(Boolean), C: normalizeCards(hands.E.C).split("").filter(Boolean) },
    S: { S: normalizeCards(hands.S.S).split("").filter(Boolean), H: normalizeCards(hands.S.H).split("").filter(Boolean), D: normalizeCards(hands.S.D).split("").filter(Boolean), C: normalizeCards(hands.S.C).split("").filter(Boolean) },
  }
}

function totalPlayedCards(steps: PlayStep[]): number {
  return steps.reduce((sum, step) => sum + step.cards.length, 0)
}

function normalizePlayTimeline(steps: PlayStep[], fallbackLeader: Seat, denom: Denom | null): PlayStep[] {
  const sorted = [...steps]
    .map((step) => ({
      ...step,
      note: step.note ?? null,
      cards: step.cards.map((card) => normalizePlayCard(card)).filter((card) => Boolean(card.rank)),
    }))
    .filter((step) => step.cards.length || step.note)
    .sort((a, b) => a.trickNo - b.trickNo)

  const normalized: PlayStep[] = []
  for (let i = 0; i < sorted.length; i += 1) {
    const step = sorted[i]
    const prev = normalized[i - 1]
    const leader = prev?.winner ?? step.leader ?? fallbackLeader
    const cards = step.cards.slice(0, 4)
    normalized.push({
      trickNo: i + 1,
      leader,
      cards,
      winner: computeTrickWinner(leader, cards, denom),
      note: step.note ?? null,
    })
  }
  return normalized
}

function removeCardFromViewerHands(hands: ViewerHands, card: PlayCard) {
  const list = hands[card.seat][card.suit]
  const idx = list.findIndex((rank) => rank === card.rank)
  if (idx >= 0) list.splice(idx, 1)
}

function buildViewerFrame(
  hands: DealHands,
  steps: PlayStep[],
  cursor: number,
  fallbackLeader: Seat,
  denom: Denom | null,
): ViewerFrame {
  const normalized = normalizePlayTimeline(steps, fallbackLeader, denom)
  const total = totalPlayedCards(normalized)
  const boundedCursor = Math.max(0, Math.min(cursor, total))
  const remaining = cloneViewerHands(hands)
  let cardsToApply = boundedCursor
  let trickNo = 1
  let leader = normalized[0]?.leader ?? fallbackLeader
  let trickCards: PlayCard[] = []
  let nsTricks = 0
  let ewTricks = 0

  for (let i = 0; i < normalized.length; i += 1) {
    const step = normalized[i]
    const take = Math.min(cardsToApply, step.cards.length)
    const takenCards = step.cards.slice(0, take)
    takenCards.forEach((card) => removeCardFromViewerHands(remaining, card))

    if (take < step.cards.length) {
      trickNo = step.trickNo
      leader = step.leader
      trickCards = takenCards
      cardsToApply = 0
      break
    }

    cardsToApply -= take
    const winner = computeTrickWinner(step.leader, step.cards, denom)
    if (winner) {
      if (seatSide(winner) === "NS") nsTricks += 1
      else ewTricks += 1
    }
    trickNo = step.trickNo + 1
    leader = winner ?? step.leader
    trickCards = []
  }

  const nextActor = nextSeat(leader, trickCards.length)
  return { hands: remaining, trickNo, leader, trickCards, nextActor, nsTricks, ewTricks }
}

function isLegalPlayFromViewer(frame: ViewerFrame, seat: Seat, suit: Suit): boolean {
  if (frame.nextActor !== seat) return false
  const leadSuit = frame.trickCards[0]?.suit
  if (!leadSuit || suit === leadSuit) return true
  return frame.hands[seat][leadSuit].length === 0
}

function seatSide(seat: Seat): "NS" | "EW" {
  return seat === "N" || seat === "S" ? "NS" : "EW"
}

function appendCardToTimeline(
  steps: PlayStep[],
  frame: ViewerFrame,
  card: PlayCard,
  fallbackLeader: Seat,
  denom: Denom | null,
): PlayStep[] {
  const normalized = normalizePlayTimeline(steps, fallbackLeader, denom)
  const next: PlayStep[] = normalized.map((step) => ({ ...step, cards: [...step.cards] }))
  const stepIndex = next.findIndex((step) => step.trickNo === frame.trickNo)
  const target =
    stepIndex >= 0
      ? next[stepIndex]
      : {
          trickNo: frame.trickNo,
          leader: frame.leader,
          cards: [] as PlayCard[],
          winner: null as Seat | null,
          note: null as string | null,
        }

  if (stepIndex < 0) next.push(target)
  target.leader = frame.leader
  target.cards.push(normalizePlayCard(card))
  target.winner = computeTrickWinner(target.leader, target.cards, denom)
  return normalizePlayTimeline(next, fallbackLeader, denom)
}

function removeLastCardFromTimeline(steps: PlayStep[], fallbackLeader: Seat, denom: Denom | null): PlayStep[] {
  const next = normalizePlayTimeline(steps, fallbackLeader, denom).map((step) => ({ ...step, cards: [...step.cards] }))
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (!next[i]) continue
    if (next[i].cards.length > 0) {
      next[i].cards.pop()
      if (!next[i].cards.length && !next[i].note) next.splice(i, 1)
      break
    }
  }
  return normalizePlayTimeline(next, fallbackLeader, denom)
}

function serializePlayRecord(steps: PlayStep[]): string {
  return steps
    .map((step) => {
      const cards = step.cards.map((card) => `${card.seat}${card.suit}${card.rank}`).join(".")
      const winner = step.winner ?? "-"
      return `${step.trickNo}${step.leader}:${cards || "-"}:${winner}`
    })
    .join(";")
}

function parsePlayRecord(input: string): { steps: PlayStep[]; error: string | null } {
  const text = input.trim()
  if (!text) return { steps: [], error: "Record is empty" }
  const chunks = text.split(";").map((chunk) => chunk.trim()).filter(Boolean)
  if (!chunks.length) return { steps: [], error: "Record is empty" }

  const parsed: PlayStep[] = []
  for (const chunk of chunks) {
    const match = chunk.match(/^(\d+)([WNES]):([^:]+):([WNES-])$/i)
    if (!match) {
      return { steps: [], error: `Invalid chunk: ${chunk}` }
    }
    const trickNo = Number(match[1] ?? "0")
    const leader = (match[2] ?? "W").toUpperCase() as Seat
    const cardsToken = (match[3] ?? "-").trim()
    const winnerToken = (match[4] ?? "-").toUpperCase()
    const cards: PlayCard[] = []

    if (cardsToken !== "-" && cardsToken.length > 0) {
      const cardTokens = cardsToken.split(".").map((item) => item.trim()).filter(Boolean)
      for (const cardToken of cardTokens) {
        const m = cardToken.match(/^([WNES])([SHDC])([AKQJT98765432])$/i)
        if (!m) return { steps: [], error: `Invalid card token: ${cardToken}` }
        cards.push({
          seat: (m[1] ?? "W").toUpperCase() as Seat,
          suit: (m[2] ?? "S").toUpperCase() as Suit,
          rank: (m[3] ?? "A").toUpperCase(),
        })
      }
    }

    parsed.push({
      trickNo: Number.isNaN(trickNo) ? parsed.length + 1 : trickNo,
      leader,
      cards,
      winner: winnerToken === "-" ? null : (winnerToken as Seat),
      note: null,
    })
  }
  return { steps: parsed, error: null }
}

function contractLabel(draft: DraftStudy | null) {
  if (!draft || !draft.contractLevel || !draft.contractDenom || !draft.declarer) return null
  const dbl = draft.doubledState === "none" ? "" : draft.doubledState
  return `${draft.contractLevel}${draft.contractDenom}${dbl} by ${draft.declarer}`
}

function resultLabel(delta: number | null) {
  if (delta === null || Number.isNaN(delta)) return null
  if (delta === 0) return "Made"
  if (delta > 0) return `Made +${delta}`
  return `Down ${Math.abs(delta)}`
}

function pct(v: number, total: number) {
  if (!total) return "0%"
  return `${Math.round((v / total) * 100)}%`
}

function CommentTree({
  root,
  map,
  onReply,
  onAnchor,
  depth = 0,
}: {
  root: StudyPayload["study"]["comments"][number]
  map: Record<string, StudyPayload["study"]["comments"]>
  onReply: (id: string) => void
  onAnchor: (anchor: { type: "auction" | "play" | "general"; ref?: string }) => void
  depth?: number
}) {
  const children = map[root.id] ?? []
  return (
    <div className="space-y-2" style={{ marginLeft: `${Math.min(depth, 4) * 20}px` }}>
      <article className="rounded-xl border border-[#d8dbe1] bg-white p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#1f2734]">{root.author.name}</p>
            <p className="text-xs text-[#7a8394]">{new Date(root.createdAt).toLocaleString("ru-RU")}</p>
          </div>
          <div className="flex gap-1.5">
            {root.anchor ? (
              <button type="button" onClick={() => onAnchor(root.anchor ?? { type: "general" })} className="rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-1 text-xs text-[#5f6a7b]">
                Open anchor
              </button>
            ) : null}
            <button type="button" onClick={() => onReply(root.id)} className="rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-1 text-xs text-[#5f6a7b]">Reply</button>
          </div>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#2b3446]">{root.body}</p>
      </article>
      {children.map((child) => (
        <CommentTree key={child.id} root={child} map={map} onReply={onReply} onAnchor={onAnchor} depth={depth + 1} />
      ))}
    </div>
  )
}

function SeatHandCard({
  seat,
  mode,
  hands,
  canEdit,
  onChange,
}: {
  seat: Seat
  mode: "quick" | "picker"
  hands: DealHands
  canEdit: boolean
  onChange: (next: DealHands) => void
}) {
  const hand = hands[seat]
  return (
    <article className={`rounded-xl border border-[#d8dbe1] bg-[#fbfcff] p-2.5 ${SEAT_POS[seat]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">{seat}</p>
      {mode === "quick" ? (
        <input
          disabled={!canEdit}
          value={seatQuick(hand)}
          onChange={(event) => onChange({ ...hands, [seat]: parseSeatQuick(event.target.value) })}
          className="mt-1 h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"
        />
      ) : (
        <div className="mt-1 space-y-1">
          {SUITS.map((suit) => (
            <div key={`${seat}-${suit}`} className="flex items-center gap-1">
              <span className={`w-4 text-sm font-semibold ${SUIT_META[suit].className}`}>{SUIT_META[suit].symbol}</span>
              <div className="flex flex-wrap gap-1">
                {RANKS.map((rank) => {
                  const active = hand[suit].includes(rank)
                  return (
                    <button
                      key={`${seat}-${suit}-${rank}`}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => onChange({ ...hands, [seat]: { ...hand, [suit]: toggleCard(hand[suit], rank) } })}
                      className={`h-6 min-w-6 rounded-md px-1 text-[11px] ${active ? "bg-[#dfeafb] text-[#24487a]" : "bg-[#f2f5fb] text-[#5f6a7b]"}`}
                    >
                      {rank}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export function DealStudyWorkspace({ contentId }: { contentId: string }) {
  const utils = trpc.useUtils()
  const refs = React.useRef<Record<string, HTMLElement | null>>({})
  const query = trpc.content.study.get.useQuery({ contentId }, { enabled: Boolean(contentId) })
  const publishMutation = trpc.content.publish.useMutation()
  const saveDraftMutation = trpc.content.study.upsertDraft.useMutation()
  const savePlayMutation = trpc.content.study.upsertPlay.useMutation()
  const saveDdMutation = trpc.content.study.upsertDd.useMutation()
  const addCommentMutation = trpc.content.study.addComment.useMutation()
  const createPollMutation = trpc.content.study.createPoll.useMutation()
  const votePollMutation = trpc.content.study.votePoll.useMutation()
  const closePollMutation = trpc.content.study.closePoll.useMutation()

  const payload = query.data as StudyPayload | undefined
  const canEdit = Boolean(payload?.capabilities.canEdit)
  const canPublish = Boolean(payload?.capabilities.canPublish)
  const canComment = Boolean(payload?.capabilities.canComment)
  const canVote = Boolean(payload?.capabilities.canVote)
  const canCreatePoll = Boolean(payload?.capabilities.canCreatePoll)

  const [mode, setMode] = React.useState<"quick" | "picker">("quick")
  const [tab, setTab] = React.useState<AnalysisTab>("play")
  const [playView, setPlayView] = React.useState<"viewer" | "timeline">("viewer")
  const [playSurface, setPlaySurface] = React.useState<"clean" | "felt">("clean")
  const [draft, setDraft] = React.useState<DraftStudy | null>(null)
  const [playSteps, setPlaySteps] = React.useState<PlayStep[]>([])
  const [selectedStep, setSelectedStep] = React.useState(0)
  const [playDraft, setPlayDraft] = React.useState<PlayDraft>(() => toPlayDraft(null, 1))
  const [playStartLeader, setPlayStartLeader] = React.useState<Seat>("W")
  const [playCursor, setPlayCursor] = React.useState(0)
  const [playRecord, setPlayRecord] = React.useState("")
  const [lastPlayedAnim, setLastPlayedAnim] = React.useState<{ key: string; seat: Seat } | null>(null)
  const [completedTrickFx, setCompletedTrickFx] = React.useState<{
    trickNo: number
    leader: Seat
    cards: PlayCard[]
    winner: Seat
  } | null>(null)
  const [auctionQuickInput, setAuctionQuickInput] = React.useState("")
  const [dealLink, setDealLink] = React.useState("")
  const [ddMatrix, setDdMatrix] = React.useState<DdMatrix>(defaultDd)
  const [ddPar, setDdPar] = React.useState("")
  const [ddSource, setDdSource] = React.useState<"solver" | "import">("import")
  const [ddStatus, setDdStatus] = React.useState<"idle" | "loading" | "ready" | "error">("idle")
  const [ddError, setDdError] = React.useState<string | null>(null)
  const [ddImport, setDdImport] = React.useState("")
  const [commentBody, setCommentBody] = React.useState("")
  const [commentParent, setCommentParent] = React.useState<string | null>(null)
  const [commentAnchorType, setCommentAnchorType] = React.useState<"general" | "auction" | "play">("general")
  const [commentAnchorRef, setCommentAnchorRef] = React.useState("")
  const [pollScope, setPollScope] = React.useState<PollScope>("general")
  const [pollQuestion, setPollQuestion] = React.useState("")
  const [pollOptions, setPollOptions] = React.useState<string[]>(["", ""])
  const [flash, setFlash] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [showHelp, setShowHelp] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    if (!payload) return
    const nextDraft: DraftStudy = {
      board: payload.study.board,
      dealer: payload.study.dealer,
      vulnerability: payload.study.vulnerability,
      contractLevel: payload.study.contractLevel,
      contractDenom: payload.study.contractDenom,
      declarer: payload.study.declarer,
      doubledState: payload.study.doubledState,
      resultDelta: payload.study.resultDelta,
      leadSuit: payload.study.leadSuit,
      leadRank: payload.study.leadRank,
      hands: payload.study.hands ?? emptyHands(),
      visibilityMask: payload.study.visibilityMask ?? { hiddenSeats: [], hiddenCards: [] },
      auctionStartingSeat: payload.study.auctionStartingSeat,
      auctionSequence: payload.study.auctionSequence ?? [],
      auctionNotes: payload.study.auctionNotes ?? "",
      narrativeMarkdown: payload.study.narrativeMarkdown ?? "",
    }
    setDraft(nextDraft)
    const normalizedTimeline = normalizePlayTimeline(
      payload.study.playSteps ?? [],
      payload.study.playSteps?.[0]?.leader ?? "W",
      payload.study.contractDenom ?? null,
    )
    const totalCards = totalPlayedCards(normalizedTimeline)
    setPlaySteps(normalizedTimeline)
    setPlayStartLeader(normalizedTimeline[0]?.leader ?? payload.study.playSteps?.[0]?.leader ?? "W")
    setPlayCursor(totalCards)
    setPlayRecord(serializePlayRecord(normalizedTimeline))
    setPlayDraft(toPlayDraft(normalizedTimeline[normalizedTimeline.length - 1] ?? null, normalizedTimeline.length + 1))
    setSelectedStep(Math.max(0, normalizedTimeline.length - 1))
    setAuctionQuickInput((payload.study.auctionSequence ?? []).join(" "))
    setDdMatrix(payload.study.ddSnapshot?.matrix ?? defaultDd())
    setDdPar(payload.study.ddSnapshot?.par?.text ?? "")
    setDdSource(payload.study.ddSnapshot?.source ?? "import")
    setDdStatus(payload.study.ddSnapshot ? "ready" : "idle")
    setDdError(null)
    setCompletedTrickFx(null)
    setDirty(false)
    setError(null)
  }, [payload])

  React.useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 2400)
    return () => window.clearTimeout(t)
  }, [flash])

  const handIssues = React.useMemo(() => (draft ? validateHands(draft.hands) : []), [draft])
  const playIssues = React.useMemo(() => validatePlay(playSteps), [playSteps])
  const rows = React.useMemo(() => (draft ? auctionRows(draft.auctionStartingSeat, draft.auctionSequence) : []), [draft])
  const nextActor = draft ? nextSeat(draft.auctionStartingSeat, draft.auctionSequence.length) : "W"
  const cLabel = contractLabel(draft)
  const rLabel = resultLabel(draft?.resultDelta ?? null)
  const hiddenSeats = new Set(draft?.visibilityMask.hiddenSeats ?? [])
  const contractDenom = draft?.contractDenom ?? null
  const comments = (payload?.study.comments ?? []).slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
  const commentMap = comments.reduce<Record<string, StudyPayload["study"]["comments"]>>((acc, c) => {
    const key = c.parentCommentId ?? "root"
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
  const anchors = draft
    ? [
        ...draft.auctionSequence.map((call, i) => ({ id: `auction:${i + 1}`, label: `Auction ${nextSeat(draft.auctionStartingSeat, i)} ${call}` })),
        ...playSteps.map((s) => ({ id: `play:trick:${s.trickNo}`, label: `Trick ${s.trickNo}` })),
      ]
    : []
  const playedCards = React.useMemo(() => totalPlayedCards(playSteps), [playSteps])
  const viewerFrame = React.useMemo(
    () =>
      draft
        ? buildViewerFrame(
            draft.hands,
            playSteps,
            playCursor,
            playSteps[0]?.leader ?? playStartLeader,
            contractDenom,
          )
        : null,
    [contractDenom, draft, playCursor, playStartLeader, playSteps],
  )
  const isViewerAtLiveEnd = playCursor >= playedCards

  React.useEffect(() => {
    setPlayCursor((prev) => Math.min(prev, playedCards))
  }, [playedCards])

  React.useEffect(() => {
    if (!lastPlayedAnim) return
    const t = window.setTimeout(() => setLastPlayedAnim(null), 520)
    return () => window.clearTimeout(t)
  }, [lastPlayedAnim])

  React.useEffect(() => {
    if (!completedTrickFx) return
    const t = window.setTimeout(() => setCompletedTrickFx(null), 760)
    return () => window.clearTimeout(t)
  }, [completedTrickFx])

  React.useEffect(() => {
    setPlaySteps((prev) => normalizePlayTimeline(prev, prev[0]?.leader ?? playStartLeader, contractDenom))
  }, [contractDenom, playStartLeader])

  const busy =
    query.isFetching ||
    saveDraftMutation.isPending ||
    savePlayMutation.isPending ||
    saveDdMutation.isPending ||
    addCommentMutation.isPending ||
    createPollMutation.isPending ||
    votePollMutation.isPending ||
    closePollMutation.isPending ||
    publishMutation.isPending

  const patchDraft = React.useCallback((patch: Partial<DraftStudy>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
    setDirty(true)
    setError(null)
  }, [])

  const setHands = React.useCallback((hands: DealHands) => patchDraft({ hands }), [patchDraft])

  const isMaskedCard = React.useCallback(
    (seat: Seat, suit: Suit, rank: string) => (draft?.visibilityMask.hiddenCards ?? []).some((c) => c.seat === seat && c.suit === suit && c.rank === rank),
    [draft?.visibilityMask.hiddenCards],
  )

  const toggleHiddenSeat = React.useCallback(
    (seat: Seat) => {
      if (!draft) return
      const set = new Set(draft.visibilityMask.hiddenSeats)
      if (set.has(seat)) set.delete(seat)
      else set.add(seat)
      patchDraft({ visibilityMask: { ...draft.visibilityMask, hiddenSeats: SEATS.filter((s) => set.has(s)) } })
    },
    [draft, patchDraft],
  )

  const toggleHiddenCard = React.useCallback(
    (seat: Seat, suit: Suit, rank: string) => {
      if (!draft) return
      const cards = [...draft.visibilityMask.hiddenCards]
      const idx = cards.findIndex((c) => c.seat === seat && c.suit === suit && c.rank === rank)
      if (idx >= 0) cards.splice(idx, 1)
      else cards.push({ seat, suit, rank })
      patchDraft({ visibilityMask: { ...draft.visibilityMask, hiddenCards: cards } })
    },
    [draft, patchDraft],
  )

  const saveDraft = React.useCallback(async () => {
    if (!draft || !canEdit) return
    if (handIssues.length) return setError(handIssues[0] ?? "Fix hand issues first.")
    try {
      await saveDraftMutation.mutateAsync({
        contentId,
        data: {
          board: draft.board,
          dealer: draft.dealer,
          vulnerability: draft.vulnerability,
          contractLevel: draft.contractLevel,
          contractDenom: draft.contractDenom,
          declarer: draft.declarer,
          doubledState: draft.doubledState,
          resultDelta: draft.resultDelta,
          leadSuit: draft.leadSuit,
          leadRank: draft.leadRank,
          hands: draft.hands,
          visibilityMask: draft.visibilityMask,
          auctionStartingSeat: draft.auctionStartingSeat,
          auctionSequence: draft.auctionSequence,
          auctionNotes: draft.auctionNotes ?? null,
          narrativeMarkdown: draft.narrativeMarkdown ?? "",
        },
      })
      setFlash("Study draft saved")
      setDirty(false)
      await Promise.all([query.refetch(), utils.content.get.invalidate({ contentId }), utils.content.list.invalidate()])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save draft")
    }
  }, [canEdit, contentId, draft, handIssues, query, saveDraftMutation, utils.content.get, utils.content.list])

  const publish = React.useCallback(async () => {
    if (!canPublish) return
    try {
      await publishMutation.mutateAsync({ contentId, data: {} })
      setFlash("Content published")
      await Promise.all([query.refetch(), utils.content.get.invalidate({ contentId }), utils.content.list.invalidate()])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish")
    }
  }, [canPublish, contentId, publishMutation, query, utils.content.get, utils.content.list])

  const share = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setFlash("Study URL copied")
    } catch {
      setError("Failed to copy URL")
    }
  }, [])

  const addAuctionCall = React.useCallback(
    (raw: string) => {
      if (!draft) return
      const call = normalizeAuctionCall(raw)
      if (!call) return
      const seq = [...draft.auctionSequence, call]
      patchDraft({ auctionSequence: seq })
      setAuctionQuickInput(seq.join(" "))
    },
    [draft, patchDraft],
  )

  const commitAuctionQuick = React.useCallback(() => {
    if (!draft) return
    patchDraft({ auctionSequence: parseAuctionQuick(auctionQuickInput) })
  }, [auctionQuickInput, draft, patchDraft])

  const importDealLink = React.useCallback(() => {
    if (!draft) return
    const parsed = parseBridgeDealSourceUrl(dealLink)
    if (!parsed) return setError("Invalid handviewer URL")
    patchDraft({
      board: parsed.board ?? draft.board,
      dealer: parsed.dealer ?? draft.dealer,
      vulnerability: parsed.vulnerability ?? draft.vulnerability,
      hands: {
        N: { S: normalizeCards(parsed.hands.north.spades), H: normalizeCards(parsed.hands.north.hearts), D: normalizeCards(parsed.hands.north.diamonds), C: normalizeCards(parsed.hands.north.clubs) },
        E: { S: normalizeCards(parsed.hands.east.spades), H: normalizeCards(parsed.hands.east.hearts), D: normalizeCards(parsed.hands.east.diamonds), C: normalizeCards(parsed.hands.east.clubs) },
        S: { S: normalizeCards(parsed.hands.south.spades), H: normalizeCards(parsed.hands.south.hearts), D: normalizeCards(parsed.hands.south.diamonds), C: normalizeCards(parsed.hands.south.clubs) },
        W: { S: normalizeCards(parsed.hands.west.spades), H: normalizeCards(parsed.hands.west.hearts), D: normalizeCards(parsed.hands.west.diamonds), C: normalizeCards(parsed.hands.west.clubs) },
      },
    })
    setFlash("Deal imported from link")
  }, [dealLink, draft, patchDraft])

  const focusAnchor = React.useCallback(
    (anchor: { type: "auction" | "play" | "general"; ref?: string }) => {
      if (anchor.type === "play") {
        setTab("play")
        if (anchor.ref?.startsWith("trick:")) {
          const trickNo = Number(anchor.ref.replace("trick:", ""))
          if (!Number.isNaN(trickNo)) {
            const idx = playSteps.findIndex((s) => s.trickNo === trickNo)
            if (idx >= 0) {
              setSelectedStep(idx)
              setPlayDraft(toPlayDraft(playSteps[idx] ?? null, playSteps.length + 1))
            }
          }
        }
        refs.current.play?.scrollIntoView({ behavior: "smooth", block: "start" })
      } else if (anchor.type === "auction") {
        refs.current.auction?.scrollIntoView({ behavior: "smooth", block: "start" })
      } else {
        refs.current.narrative?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    },
    [playSteps],
  )

  const pushPlayTimeline = React.useCallback(
    (nextSteps: PlayStep[]) => {
      const normalized = normalizePlayTimeline(
        nextSteps,
        nextSteps[0]?.leader ?? playStartLeader,
        draft?.contractDenom ?? null,
      )
      const totalCards = totalPlayedCards(normalized)
      setPlaySteps(normalized)
      setSelectedStep(Math.max(0, normalized.length - 1))
      setPlayDraft(toPlayDraft(normalized[normalized.length - 1] ?? null, normalized.length + 1))
      setPlayCursor(totalCards)
      setPlayRecord(serializePlayRecord(normalized))
      setDirty(true)
    },
    [draft?.contractDenom, playStartLeader],
  )

  const upsertPlayLocal = React.useCallback(() => {
    const next = fromPlayDraft(playDraft)
    if (!next.cards.length) return setError("Add at least one card in trick")
    const copy = [...playSteps]
    const idx = copy.findIndex((step) => step.trickNo === next.trickNo)
    if (idx >= 0) copy[idx] = next
    else copy.push(next)
    pushPlayTimeline(copy)
    setFlash(`Trick ${next.trickNo} updated`)
  }, [playDraft, playSteps, pushPlayTimeline])

  const deleteSelectedPlay = React.useCallback(() => {
    const step = playSteps[selectedStep]
    if (!step) return
    pushPlayTimeline(playSteps.filter((x) => x.trickNo !== step.trickNo))
    setSelectedStep(0)
    setPlayDraft(toPlayDraft(null, 1))
  }, [playSteps, pushPlayTimeline, selectedStep])

  const savePlay = React.useCallback(async () => {
    if (!canEdit) return
    if (playIssues.length) return setError(playIssues[0] ?? "Fix play timeline")
    try {
      await savePlayMutation.mutateAsync({ contentId, steps: playSteps })
      setFlash("Play timeline saved")
      await query.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save play timeline")
    }
  }, [canEdit, contentId, playIssues, playSteps, query, savePlayMutation])

  const playCardFromViewer = React.useCallback(
    (seat: Seat, suit: Suit, rank: string) => {
      if (!canEdit || !draft || !viewerFrame) return
      if (!isViewerAtLiveEnd) {
        setError("Move to live end before adding new card.")
        return
      }
      if (!isLegalPlayFromViewer(viewerFrame, seat, suit)) {
        setError("Illegal move: follow suit if possible.")
        return
      }
      const projectedCards = [...viewerFrame.trickCards, normalizePlayCard({ seat, suit, rank })]
      if (projectedCards.length === 4) {
        const winner = computeTrickWinner(viewerFrame.leader, projectedCards, draft.contractDenom ?? null)
        if (winner) {
          setCompletedTrickFx({
            trickNo: viewerFrame.trickNo,
            leader: viewerFrame.leader,
            cards: projectedCards,
            winner,
          })
        }
      }
      const nextSteps = appendCardToTimeline(
        playSteps,
        viewerFrame,
        { seat, suit, rank },
        playSteps[0]?.leader ?? playStartLeader,
        draft.contractDenom ?? null,
      )
      setLastPlayedAnim({ key: `${viewerFrame.trickNo}-${seat}-${suit}-${rank}`, seat })
      pushPlayTimeline(nextSteps)
      setError(null)
      setFlash(`${seat} plays ${SUIT_META[suit].symbol}${rank}`)
    },
    [canEdit, draft, isViewerAtLiveEnd, playStartLeader, playSteps, pushPlayTimeline, viewerFrame],
  )

  const undoViewerCard = React.useCallback(() => {
    if (!canEdit || !draft || !playSteps.length) return
    const nextSteps = removeLastCardFromTimeline(
      playSteps,
      playSteps[0]?.leader ?? playStartLeader,
      draft.contractDenom ?? null,
    )
    pushPlayTimeline(nextSteps)
    setCompletedTrickFx(null)
    setLastPlayedAnim(null)
    setError(null)
    setFlash("Last card removed")
  }, [canEdit, draft, playStartLeader, playSteps, pushPlayTimeline])

  const rewindViewer = React.useCallback(() => {
    setPlayCursor(0)
    setCompletedTrickFx(null)
    setLastPlayedAnim(null)
    setError(null)
  }, [])

  const stepViewerPrev = React.useCallback(() => {
    setPlayCursor((prev) => Math.max(0, prev - 1))
    setCompletedTrickFx(null)
    setError(null)
  }, [])

  const stepViewerNext = React.useCallback(() => {
    setPlayCursor((prev) => Math.min(playedCards, prev + 1))
    setCompletedTrickFx(null)
    setError(null)
  }, [playedCards])

  const jumpViewerLive = React.useCallback(() => {
    setPlayCursor(playedCards)
    setCompletedTrickFx(null)
    setError(null)
  }, [playedCards])

  const exportPlayRecord = React.useCallback(async () => {
    const text = serializePlayRecord(playSteps)
    setPlayRecord(text)
    try {
      await navigator.clipboard.writeText(text)
      setFlash("Play record copied")
      setError(null)
    } catch {
      setFlash("Play record generated")
    }
  }, [playSteps])

  const importPlayRecord = React.useCallback(() => {
    if (!draft) return
    const parsed = parsePlayRecord(playRecord)
    if (parsed.error) {
      setError(parsed.error)
      return
    }
    const normalized = normalizePlayTimeline(
      parsed.steps,
      parsed.steps[0]?.leader ?? playStartLeader,
      draft.contractDenom ?? null,
    )
    pushPlayTimeline(normalized)
    setPlayCursor(totalPlayedCards(normalized))
    setCompletedTrickFx(null)
    setError(null)
    setFlash("Play record imported")
  }, [draft, playRecord, playStartLeader, pushPlayTimeline])

  const importDd = React.useCallback(() => {
    try {
      const parsed = JSON.parse(ddImport) as { matrix?: DdMatrix; par?: { text?: string } }
      if (parsed.matrix) setDdMatrix(parsed.matrix)
      if (parsed.par?.text) setDdPar(parsed.par.text)
      setDdStatus("ready")
      setDdError(null)
      setFlash("DD imported")
    } catch {
      setDdStatus("error")
      setDdError("Invalid DD JSON")
    }
  }, [ddImport])

  const runSolverStub = React.useCallback(async () => {
    setDdStatus("loading")
    setDdError(null)
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    setDdStatus("error")
    setDdError("Solver integration is not connected yet. Use import mode.")
  }, [])

  const saveDd = React.useCallback(async () => {
    if (!canEdit) return
    try {
      await saveDdMutation.mutateAsync({ contentId, data: { source: ddSource, matrix: ddMatrix, par: { text: ddPar || "No par summary" } } })
      setDdStatus("ready")
      setDdError(null)
      setFlash("DD snapshot saved")
      await query.refetch()
    } catch (e) {
      setDdStatus("error")
      setDdError(e instanceof Error ? e.message : "Failed to save DD snapshot")
    }
  }, [canEdit, contentId, ddMatrix, ddPar, ddSource, query, saveDdMutation])

  const addComment = React.useCallback(async () => {
    if (!canComment || !commentBody.trim()) return
    try {
      await addCommentMutation.mutateAsync({
        contentId,
        data: {
          parentCommentId: commentParent,
          body: commentBody.trim(),
          anchor: commentAnchorType === "general" ? { type: "general" } : { type: commentAnchorType, ref: commentAnchorRef || undefined },
        },
      })
      setCommentBody("")
      setCommentParent(null)
      setCommentAnchorRef("")
      setFlash("Comment added")
      await query.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add comment")
    }
  }, [addCommentMutation, canComment, commentAnchorRef, commentAnchorType, commentBody, commentParent, contentId, query])

  const createPoll = React.useCallback(async () => {
    if (!canCreatePoll) return
    const options = pollOptions.map((x) => x.trim()).filter(Boolean)
    if (!pollQuestion.trim() || options.length < 2) return setError("Poll requires question and at least two options")
    try {
      await createPollMutation.mutateAsync({ contentId, data: { scope: pollScope, question: pollQuestion.trim(), options } })
      setPollQuestion("")
      setPollOptions(["", ""])
      setFlash("Poll created")
      await query.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create poll")
    }
  }, [canCreatePoll, contentId, createPollMutation, pollOptions, pollQuestion, pollScope, query])

  const votePoll = React.useCallback(async (pollId: string, optionId: string) => {
    if (!canVote) return
    try {
      await votePollMutation.mutateAsync({ contentId, data: { pollId, optionId } })
      await query.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to vote")
    }
  }, [canVote, contentId, query, votePollMutation])

  const closePoll = React.useCallback(async (pollId: string, isClosed: boolean) => {
    if (!canCreatePoll) return
    try {
      await closePollMutation.mutateAsync({ contentId, data: { pollId, isClosed } })
      await query.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update poll")
    }
  }, [canCreatePoll, closePollMutation, contentId, query])

  if (query.error) {
    return (
      <div className="mx-auto max-w-[1040px] rounded-2xl border border-[#e5cad0] bg-[#fff3f5] p-5 text-[#8b3240]">
        <p className="font-medium">Failed to open deal workspace</p>
        <p className="mt-1 text-sm">{query.error.message}</p>
      </div>
    )
  }

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-[1040px] rounded-2xl border border-[#d8dbe1] bg-white/84 p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 text-[#55627a]">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Loading deal study workspace...
        </div>
      </div>
    )
  }

  if (!payload || !draft) {
    return (
      <div className="mx-auto max-w-[1040px] rounded-2xl border border-[#e5cad0] bg-[#fff3f5] p-5 text-[#8b3240]">
        <p className="font-medium">Failed to open deal workspace</p>
        <p className="mt-1 text-sm">Study payload is unavailable.</p>
      </div>
    )
  }

  const selectedPlay = playSteps[selectedStep] ?? null
  const polls = payload.study.polls ?? []
  const tableTrickCards = completedTrickFx?.cards ?? (viewerFrame?.trickCards ?? [])
  const tableTrickNo = completedTrickFx?.trickNo ?? viewerFrame?.trickNo ?? null
  const tableLeader = completedTrickFx?.leader ?? viewerFrame?.leader ?? null
  const tableNextActor = completedTrickFx ? null : (viewerFrame?.nextActor ?? null)
  const viewerLeadSuit = tableTrickCards[0]?.suit ?? null
  const isFelt = playSurface === "felt"
  const viewerCardsBySeat: Partial<Record<Seat, PlayCard>> = {}
  tableTrickCards.forEach((card) => {
    viewerCardsBySeat[card.seat] = card
  })

  return (
    <div className="mx-auto max-w-[1100px] pb-8">
      <div className="overflow-hidden rounded-2xl border border-[#d8dbe1] bg-white/88 shadow-sm">
      <section className="sticky top-0 z-20 border-b border-[#e3e8f0] bg-[#f9fbff]/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#6b778d]">Deal Studio</p>
            <h1 className="text-[34px] font-semibold leading-[1.05] text-[#1f2734]">{payload.content.title}</h1>
            {payload.content.summary ? <p className="mt-1 text-sm text-[#5f6a7b]">{payload.content.summary}</p> : null}
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-[#5f6a7b]">
              <span className="rounded-full bg-[#f2f5fb] px-2 py-0.5">Board: {draft.board ?? "—"}</span>
              <span className="rounded-full bg-[#f2f5fb] px-2 py-0.5">Contract: {cLabel ?? "—"}</span>
              <span className="rounded-full bg-[#f2f5fb] px-2 py-0.5">Result: {rLabel ?? "—"}</span>
              {hiddenSeats.size || draft.visibilityMask.hiddenCards.length ? (
                <span className="rounded-full bg-[#fff3db] px-2 py-0.5 text-[#8a5a1b]">Masked ({hiddenSeats.size} seats, {draft.visibilityMask.hiddenCards.length} cards)</span>
              ) : null}
              <span className={`rounded-full px-2 py-0.5 ${canEdit ? "bg-[#ecf7ef] text-[#2d6a48]" : "bg-[#edf3ff] text-[#304f86]"}`}>{canEdit ? "Editor mode" : "Reader mode"}</span>
              {dirty ? <span className="rounded-full bg-[#fff3db] px-2 py-0.5 text-[#8a5a1b]">Unsaved changes</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={share} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#d6dbe5] bg-[#f5f7fb] px-3 text-sm font-medium text-[#314766] hover:bg-[#eaf0fb]"><CopyIcon className="size-4" /> Share</button>
            {canPublish ? <button type="button" onClick={publish} disabled={busy || payload.content.status === "archived"} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#bbd8c8] bg-[#e8f7ee] px-3 text-sm font-medium text-[#2f6a4a] disabled:opacity-60"><SendIcon className="size-4" /> Publish</button> : null}
            {canEdit ? <button type="button" onClick={saveDraft} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#c7d5ee] bg-[#eaf1fd] px-3 text-sm font-medium text-[#2f4f86] disabled:opacity-60">{saveDraftMutation.isPending ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />} Save</button> : null}
          </div>
        </div>
        {flash ? <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#ecf7ef] px-2.5 py-1 text-xs text-[#2f6a4a]"><CheckIcon className="size-3.5" />{flash}</p> : null}
        {error ? <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#fff3f5] px-2.5 py-1 text-xs text-[#8b3240]"><AlertCircleIcon className="size-3.5" />{error}</p> : null}
      </section>

      <section className="border-b border-[#e7ebf2] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-[#1f2734]">Hands composer</h2>
            <p className="text-sm text-[#60708a]">W/N/E/S by suits with quick parser and card picker.</p>
          </div>
          <div className="inline-flex rounded-xl border border-[#d8dbe1] bg-[#f7f9fd] p-1 text-sm">
            <button type="button" onClick={() => setMode("quick")} className={`rounded-lg px-2.5 py-1 ${mode === "quick" ? "bg-[#e6edf9] text-[#2f4f86]" : "text-[#5f6a7b]"}`}>Quick</button>
            <button type="button" onClick={() => setMode("picker")} className={`rounded-lg px-2.5 py-1 ${mode === "picker" ? "bg-[#e6edf9] text-[#2f4f86]" : "text-[#5f6a7b]"}`}>Picker</button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input value={draft.board ?? ""} disabled={!canEdit} onChange={(e) => patchDraft({ board: e.target.value || null })} placeholder="Board" className="h-10 rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] px-3 text-sm" />
          <select value={draft.dealer} disabled={!canEdit} onChange={(e) => patchDraft({ dealer: e.target.value as Seat })} className="h-10 rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] px-3 text-sm">{SEATS.map((s) => <option key={`dealer-${s}`} value={s}>Dealer: {s}</option>)}</select>
          <select value={draft.vulnerability} disabled={!canEdit} onChange={(e) => patchDraft({ vulnerability: e.target.value as Vulnerability })} className="h-10 rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] px-3 text-sm">{VULNERABILITIES.map((v) => <option key={`v-${v}`} value={v}>Vulnerability: {v}</option>)}</select>
          <div className="flex gap-2">
            <input value={dealLink} disabled={!canEdit} onChange={(e) => setDealLink(e.target.value)} placeholder="BBO handviewer URL" className="h-10 w-full rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] px-3 text-sm" />
            {canEdit ? <button type="button" onClick={importDealLink} className="h-10 rounded-xl border border-[#cad8ef] bg-[#e9f0fb] px-3 text-sm font-medium text-[#2f4f86]">Parse</button> : null}
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {SEATS.map((seat) => <SeatHandCard key={`seat-${seat}`} seat={seat} mode={mode} hands={draft.hands} canEdit={canEdit} onChange={setHands} />)}
          <article className="rounded-xl border border-dashed border-[#d8dbe1] bg-white/80 p-2.5 md:col-start-2 md:row-start-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">Visibility masks</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SEATS.map((seat) => (
                <button key={`mask-seat-${seat}`} type="button" disabled={!canEdit} onClick={() => toggleHiddenSeat(seat)} className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs ${hiddenSeats.has(seat) ? "border-[#cc9b9b] bg-[#fff1f2] text-[#8b3240]" : "border-[#d8dbe1] bg-[#f4f6fb] text-[#5f6a7b]"}`}>
                  {hiddenSeats.has(seat) ? <EyeOffIcon className="size-3" /> : <EyeIcon className="size-3" />} Hide {seat}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-1.5">
              {SEATS.map((seat) => (
                <div key={`mask-${seat}`}>
                  <p className="text-[11px] font-medium uppercase text-[#7a8394]">{seat}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {SUITS.flatMap((suit) =>
                      draft.hands[seat][suit]
                        .split("")
                        .filter((rank) => RANKS.includes(rank as Rank))
                        .map((rank) => {
                          const masked = isMaskedCard(seat, suit, rank)
                          return (
                            <button key={`mask-${seat}-${suit}-${rank}`} type="button" disabled={!canEdit} onClick={() => toggleHiddenCard(seat, suit, rank)} className={`inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] ${masked ? "bg-[#fff1f2] text-[#8b3240]" : "bg-[#eef2f9] text-[#5f6a7b]"}`}>
                              <span className={`font-semibold ${SUIT_META[suit].className}`}>{SUIT_META[suit].symbol}</span>{rank}
                            </button>
                          )
                        }),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
        {handIssues.length ? <div className="mt-3 rounded-xl border border-[#f0d8ba] bg-[#fff7ed] p-2.5 text-sm text-[#8a5a1b]">{handIssues.map((i) => <p key={i}>{i}</p>)}</div> : null}
      </section>

      <section ref={(el) => { refs.current.auction = el }} className="border-b border-[#e7ebf2] px-5 py-4">
        <h2 className="text-xl font-semibold text-[#1f2734]">Auction and opening lead</h2>
        <p className="text-sm text-[#60708a]">Quick input + guided bid pad with seat order.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
          <select value={draft.auctionStartingSeat} disabled={!canEdit} onChange={(e) => patchDraft({ auctionStartingSeat: e.target.value as Seat })} className="h-10 rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] px-3 text-sm">{SEATS.map((s) => <option key={`start-${s}`} value={s}>Starts: {s}</option>)}</select>
          <div className="flex gap-2">
            <input value={auctionQuickInput} disabled={!canEdit} onChange={(e) => setAuctionQuickInput(e.target.value)} onBlur={commitAuctionQuick} placeholder="Quick input: 1C P 1H P 2NT" className="h-10 w-full rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] px-3 text-sm" />
            {canEdit ? <button type="button" onClick={commitAuctionQuick} className="h-10 rounded-xl border border-[#cad8ef] bg-[#e9f0fb] px-3 text-sm font-medium text-[#2f4f86]">Apply</button> : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[#ecf2ff] px-2 py-0.5 text-xs text-[#304f86]">Next actor: {nextActor}</span>
          {canEdit ? (
            <>
              <button type="button" onClick={() => { const seq = draft.auctionSequence.slice(0, -1); patchDraft({ auctionSequence: seq }); setAuctionQuickInput(seq.join(" ")) }} className="h-7 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b]">Undo</button>
              <button type="button" onClick={() => { patchDraft({ auctionSequence: [] }); setAuctionQuickInput("") }} className="h-7 rounded-lg border border-[#e8c9d0] bg-[#fff4f6] px-2 text-xs text-[#8b3240]">Clear</button>
            </>
          ) : null}
        </div>
        {canEdit ? (
          <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] p-2">
            <select value={draft.contractLevel ?? 1} onChange={(e) => patchDraft({ contractLevel: Number(e.target.value) })} className="h-8 rounded-md border border-[#cfd5df] bg-white px-2 text-sm">{[1, 2, 3, 4, 5, 6, 7].map((level) => <option key={`l-${level}`} value={level}>{level}</option>)}</select>
            {DENOMS.map((d) => <button key={`den-${d}`} type="button" onClick={() => addAuctionCall(`${draft.contractLevel ?? 1}${d}`)} className="h-8 min-w-9 rounded-md border border-[#cad8ef] bg-[#e9f0fb] px-2 text-sm font-medium text-[#2f4f86]">{d === "NT" ? "NT" : SUIT_META[d].symbol}</button>)}
            <button type="button" onClick={() => addAuctionCall("P")} className="h-8 rounded-md border border-[#d8dbe1] bg-white px-2 text-sm">Pass</button>
            <button type="button" onClick={() => addAuctionCall("X")} className="h-8 rounded-md border border-[#d8dbe1] bg-white px-2 text-sm">X</button>
            <button type="button" onClick={() => addAuctionCall("XX")} className="h-8 rounded-md border border-[#d8dbe1] bg-white px-2 text-sm">XX</button>
          </div>
        ) : null}
        <div className="mt-2 overflow-hidden rounded-xl border border-[#d8dbe1]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#f2f5fb] text-[#5f6a7b]"><tr>{SEATS.map((s) => <th key={`h-${s}`} className={`border-b border-[#d8dbe1] px-2 py-1.5 text-center font-semibold ${s === nextActor ? "bg-[#e8effd] text-[#2f4f86]" : ""}`}>{s}</th>)}</tr></thead>
            <tbody>
              {rows.length ? rows.map((row, rowIndex) => <tr key={`ar-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#fbfcff]"}>{row.map((c, i) => <td key={`ac-${rowIndex}-${i}`} className="border-t border-[#edf0f5] px-2 py-1.5 text-center font-medium text-[#2f466d]">{c ?? "—"}</td>)}</tr>) : <tr><td colSpan={4} className="px-2 py-2 text-center text-sm text-[#7a8394]">No calls yet</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <textarea value={draft.auctionNotes ?? ""} disabled={!canEdit} onChange={(e) => patchDraft({ auctionNotes: e.target.value || null })} rows={2} placeholder="Auction notes" className="rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] px-3 py-2 text-sm" />
          <div className="rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] p-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6f7b90]">Contract + lead</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <select value={draft.contractLevel ?? ""} disabled={!canEdit} onChange={(e) => patchDraft({ contractLevel: e.target.value ? Number(e.target.value) : null })} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"><option value="">Level</option>{[1,2,3,4,5,6,7].map((l)=><option key={`cl-${l}`} value={l}>{l}</option>)}</select>
              <select value={draft.contractDenom ?? ""} disabled={!canEdit} onChange={(e) => patchDraft({ contractDenom: (e.target.value || null) as Denom | null })} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"><option value="">Denom</option>{DENOMS.map((d)=><option key={`cd-${d}`} value={d}>{d}</option>)}</select>
              <select value={draft.declarer ?? ""} disabled={!canEdit} onChange={(e) => patchDraft({ declarer: (e.target.value || null) as Seat | null })} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"><option value="">Declarer</option>{SEATS.map((s)=><option key={`dc-${s}`} value={s}>{s}</option>)}</select>
              <select value={draft.doubledState} disabled={!canEdit} onChange={(e) => patchDraft({ doubledState: e.target.value as "none" | "X" | "XX" })} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm">{DOUBLED.map((v)=><option key={`db-${v}`} value={v}>{v==="none"?"Undoubled":v}</option>)}</select>
              <select value={draft.leadSuit ?? ""} disabled={!canEdit} onChange={(e) => patchDraft({ leadSuit: (e.target.value || null) as Suit | null })} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"><option value="">Lead suit</option>{SUITS.map((s)=><option key={`ls-${s}`} value={s}>{SUIT_META[s].symbol} {s}</option>)}</select>
              <input value={draft.leadRank ?? ""} disabled={!canEdit} onChange={(e) => patchDraft({ leadRank: normalizeCards(e.target.value).slice(0, 1) || null })} placeholder="Lead rank" className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm" />
              <input value={draft.resultDelta ?? ""} disabled={!canEdit} onChange={(e) => patchDraft({ resultDelta: e.target.value.trim() ? Number(e.target.value) : null })} placeholder="Result delta" className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm" />
            </div>
          </div>
        </div>
      </section>

      <section ref={(el) => { refs.current.play = el }} className="border-b border-[#e7ebf2] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-semibold text-[#1f2734]">Analysis</h2><p className="text-sm text-[#60708a]">Play timeline, DD, and narrative.</p></div><div className="inline-flex rounded-xl border border-[#d8dbe1] bg-[#f7f9fd] p-1 text-sm">{ANALYSIS_TABS.map((t)=><button key={`t-${t}`} type="button" onClick={()=>setTab(t)} className={`rounded-lg px-2.5 py-1 capitalize ${tab===t?"bg-[#e6edf9] text-[#2f4f86]":"text-[#5f6a7b]"}`}>{t}</button>)}</div></div>

        {tab === "play" ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-xl border border-[#d8dbe1] bg-[#f7f9fd] p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setPlayView("viewer")}
                  className={`rounded-lg px-2.5 py-1 ${playView === "viewer" ? "bg-[#e6edf9] text-[#2f4f86]" : "text-[#5f6a7b]"}`}
                >
                  Viewer
                </button>
                <button
                  type="button"
                  onClick={() => setPlayView("timeline")}
                  className={`rounded-lg px-2.5 py-1 ${playView === "timeline" ? "bg-[#e6edf9] text-[#2f4f86]" : "text-[#5f6a7b]"}`}
                >
                  Timeline
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {playView === "viewer" ? (
                  <div className="inline-flex rounded-xl border border-[#d8dbe1] bg-[#f7f9fd] p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setPlaySurface("clean")}
                      className={`rounded-lg px-2 py-1 ${playSurface === "clean" ? "bg-[#e6edf9] text-[#2f4f86]" : "text-[#5f6a7b]"}`}
                    >
                      Clean
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlaySurface("felt")}
                      className={`rounded-lg px-2 py-1 ${playSurface === "felt" ? "bg-[#eaf6ee] text-[#2f6a4a]" : "text-[#5f6a7b]"}`}
                    >
                      Felt
                    </button>
                  </div>
                ) : null}
                <span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs text-[#304f86]">
                  Cards: {playCursor}/{playedCards}
                </span>
                <span className="rounded-full bg-[#eef3ec] px-2 py-0.5 text-xs text-[#2f6a4a]">
                  Live trick: {tableTrickNo ?? "—"}
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={savePlay}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#c7d5ee] bg-[#eaf1fd] px-2 text-xs font-medium text-[#2f4f86]"
                  >
                    <SaveIcon className="size-3.5" />
                    Save timeline
                  </button>
                ) : (
                  <span className="rounded-full bg-[#f2f5fb] px-2 py-0.5 text-xs text-[#5f6a7b]">Replay mode</span>
                )}
              </div>
            </div>

            {playView === "viewer" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={stepViewerPrev}
                    disabled={playCursor <= 0}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b] disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="size-3.5" />
                    Prev card
                  </button>
                  <button
                    type="button"
                    onClick={stepViewerNext}
                    disabled={playCursor >= playedCards}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b] disabled:opacity-50"
                  >
                    Next card
                    <ChevronRightIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={rewindViewer}
                    disabled={playCursor <= 0}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b] disabled:opacity-50"
                  >
                    Rewind
                  </button>
                  <button
                    type="button"
                    onClick={jumpViewerLive}
                    disabled={isViewerAtLiveEnd}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b] disabled:opacity-50"
                  >
                    Go live
                  </button>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={undoViewerCard}
                      disabled={!playedCards || !isViewerAtLiveEnd}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e8c9d0] bg-[#fff4f6] px-2 text-xs font-medium text-[#8b3240] disabled:opacity-50"
                    >
                      <Trash2Icon className="size-3.5" />
                      Undo last
                    </button>
                  ) : null}
                  {!playSteps.length && canEdit ? (
                    <select
                      value={playStartLeader}
                      onChange={(event) => setPlayStartLeader(event.target.value as Seat)}
                      className="h-8 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b]"
                    >
                      {SEATS.map((seat) => (
                        <option key={`play-start-${seat}`} value={seat}>
                          Opening leader: {seat}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                <div className="rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] p-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">Play record</p>
                    <button
                      type="button"
                      onClick={exportPlayRecord}
                      className="inline-flex h-7 items-center rounded-lg border border-[#d8dbe1] bg-white px-2 text-xs text-[#5f6a7b]"
                    >
                      Export
                    </button>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={importPlayRecord}
                        className="inline-flex h-7 items-center rounded-lg border border-[#cad8ef] bg-[#e9f0fb] px-2 text-xs font-medium text-[#2f4f86]"
                      >
                        Import
                      </button>
                    ) : null}
                  </div>
                  <input
                    value={playRecord}
                    onChange={(event) => setPlayRecord(event.target.value)}
                    placeholder="1N:NSA.EH2.SD3.WC4:N;2N:..."
                    className="mt-1.5 h-8 w-full rounded-lg border border-[#d8dbe1] bg-white px-2 text-xs text-[#42506a]"
                  />
                </div>

                {!isViewerAtLiveEnd ? (
                  <p className="rounded-lg bg-[#fff8e9] px-2.5 py-1.5 text-xs text-[#8a5a1b]">
                    You are in replay mode. Move to live end to add new cards.
                  </p>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div
                    className={`grid gap-2 rounded-2xl p-2 md:grid-cols-3 md:grid-rows-3 ${
                      isFelt ? "border border-[#2f6a4a]/40 bg-[#2f6a4a]" : "border border-transparent bg-transparent"
                    }`}
                  >
                    {SEATS.map((seat) => {
                      const seatIsMasked = hiddenSeats.has(seat) && !canEdit
                      const isWinnerSeat = completedTrickFx?.winner === seat
                      return (
                        <article
                          key={`viewer-seat-${seat}`}
                          className={`rounded-xl border p-2.5 ${SEAT_POS[seat]} ${
                            isWinnerSeat
                              ? "border-[#7bb690] bg-[#eef8f1] ring-2 ring-[#a7d4b6] ds-winner-pulse"
                              : viewerFrame?.nextActor === seat && isViewerAtLiveEnd
                              ? "border-[#7da4de] bg-[#eef4ff] shadow-[0_0_0_1px_rgba(125,164,222,0.3)]"
                              : isFelt
                                ? "border-[#c7d6cc] bg-[#f7fbf8]"
                                : "border-[#d8dbe1] bg-[#fbfcff]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">{seat}</p>
                            {isWinnerSeat ? (
                              <span className="rounded-full bg-[#e5f6ec] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#2f6a4a]">
                                Won trick
                              </span>
                            ) : viewerFrame?.nextActor === seat ? (
                              <span className="rounded-full bg-[#eaf2ff] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#2f4f86]">
                                To play
                              </span>
                            ) : null}
                          </div>
                          {seatIsMasked ? (
                            <p className="mt-2 text-xs text-[#7a8394]">Hand is masked</p>
                          ) : (
                            <div className="mt-1.5 space-y-1">
                              {SUITS.map((suit) => {
                                const ranks = viewerFrame ? viewerFrame.hands[seat][suit] : []
                                const legalSuit = viewerFrame ? isLegalPlayFromViewer(viewerFrame, seat, suit) : false
                                return (
                                  <div key={`viewer-${seat}-${suit}`} className="flex items-start gap-1.5">
                                    <span className={`w-4 text-sm font-semibold ${SUIT_META[suit].className}`}>{SUIT_META[suit].symbol}</span>
                                    <div className="flex min-h-6 flex-wrap gap-1">
                                      {ranks.length ? (
                                        ranks.map((rank) => {
                                          const maskedCard = !canEdit && isMaskedCard(seat, suit, rank)
                                          const isActiveSeat =
                                            canEdit && isViewerAtLiveEnd && viewerFrame?.nextActor === seat
                                          const canPlayCard =
                                            isActiveSeat && legalSuit && !maskedCard
                                          if (!canPlayCard) {
                                            return (
                                              <span
                                                key={`viewer-rank-${seat}-${suit}-${rank}`}
                                                className={`rounded-md px-1 py-0.5 text-xs ${
                                                  maskedCard
                                                    ? "bg-[#f4f0f2] text-[#8a93a2]"
                                                    : isActiveSeat && !legalSuit
                                                      ? "bg-[#fff3f5] text-[#a05663] opacity-70"
                                                      : "bg-[#eef2f9] text-[#4f5e78]"
                                                }`}
                                              >
                                                {maskedCard ? "?" : rank}
                                              </span>
                                            )
                                          }
                                          return (
                                            <button
                                              key={`viewer-rank-${seat}-${suit}-${rank}`}
                                              type="button"
                                              onClick={() => playCardFromViewer(seat, suit, rank)}
                                              className="rounded-md border border-[#8aaee5] bg-[#eaf2ff] px-1 py-0.5 text-xs font-semibold text-[#2f4f86] hover:bg-[#dce9ff]"
                                            >
                                              {rank}
                                            </button>
                                          )
                                        })
                                      ) : (
                                        <span className="rounded-md bg-[#eef2f9] px-1 py-0.5 text-xs text-[#8a93a2]">—</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </article>
                      )
                    })}

                    <article
                      className={`rounded-xl border border-dashed p-2.5 md:col-start-2 md:row-start-2 ${
                        isFelt ? "border-[#d9e6dd] bg-[#edf6f0]" : "border-[#cfd7e4] bg-[#f8fafd]"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">
                        Trick {tableTrickNo ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-[#5f6a7b]">
                        Leader: {tableLeader ?? "—"} · {completedTrickFx ? `Winner: ${completedTrickFx.winner}` : `Next: ${tableNextActor ?? "—"}`}
                      </p>
                      <div className={`relative mt-2 h-[172px] rounded-lg border ${isFelt ? "border-[#6a8f73] bg-[#2f6a4a]" : "border-[#d8dbe1] bg-white"}`}>
                        {SEATS.map((seat) => {
                          const card = viewerCardsBySeat[seat]
                          const animKey = card ? `${viewerFrame?.trickNo ?? 0}-${seat}-${card.suit}-${card.rank}` : ""
                          const animClass =
                            card && lastPlayedAnim?.key === animKey
                              ? seat === "N"
                                ? "ds-trick-enter-n"
                                : seat === "E"
                                  ? "ds-trick-enter-e"
                                  : seat === "S"
                                    ? "ds-trick-enter-s"
                                    : "ds-trick-enter-w"
                              : ""
                          const posClass =
                            seat === "N"
                              ? "left-1/2 top-2 -translate-x-1/2"
                              : seat === "E"
                                ? "right-2 top-1/2 -translate-y-1/2"
                                : seat === "S"
                                  ? "bottom-2 left-1/2 -translate-x-1/2"
                                  : "left-2 top-1/2 -translate-y-1/2"
                          return (
                            <div key={`viewer-trick-${seat}`} className={`absolute ${posClass}`}>
                              <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f7b90]">{seat}</div>
                              <div className={`ds-trick-card ${animClass}`}>
                                <span className={card ? SUIT_META[card.suit].className : "text-[#9aa3b3]"}>
                                  {card ? `${SUIT_META[card.suit].symbol}${card.rank}` : "—"}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="rounded-md border border-[#d4dde8] bg-white/90 px-2 py-1 text-[11px] text-[#445066] shadow-sm">
                            NS {viewerFrame?.nsTricks ?? 0} · EW {viewerFrame?.ewTricks ?? 0}
                          </div>
                        </div>
                        {completedTrickFx ? (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="ds-trick-win-banner">
                              Trick {completedTrickFx.trickNo} won by {completedTrickFx.winner}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {viewerLeadSuit ? (
                        <p className="mt-2 text-xs text-[#60708a]">
                          Lead suit: <span className={SUIT_META[viewerLeadSuit].className}>{SUIT_META[viewerLeadSuit].symbol}</span>
                        </p>
                      ) : null}
                    </article>
                  </div>

                  <article className={`rounded-xl border p-2.5 ${isFelt ? "border-[#ced7e5] bg-[#f4f8ff]" : "border-[#d8dbe1] bg-[#f8f9fc]"}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">Live summary</p>
                    <div className="mt-2 space-y-1 text-sm text-[#445066]">
                      <p>Contract: {cLabel ?? "—"}</p>
                      <p>Result: {rLabel ?? "—"}</p>
                      <p>
                        Cursor: {playCursor}/{playedCards} cards
                      </p>
                      <p>Current trick: {viewerFrame?.trickNo ?? "—"}</p>
                      <p>Tricks: NS {viewerFrame?.nsTricks ?? 0} / EW {viewerFrame?.ewTricks ?? 0}</p>
                    </div>
                    <div className="mt-3 rounded-lg border border-[#d8dbe1] bg-white p-2 text-xs text-[#5f6a7b]">
                      Click cards only in <span className="font-medium text-[#2f4f86]">To play</span> hand. Suit-follow rule is enforced.
                    </div>
                  </article>
                </div>

                {playIssues.length ? (
                  <div className="rounded-xl border border-[#f0d8ba] bg-[#fff7ed] p-2.5 text-sm text-[#8a5a1b]">
                    {playIssues.map((issue) => (
                      <p key={issue}>{issue}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const n = Math.max(selectedStep - 1, 0)
                      setSelectedStep(n)
                      setPlayDraft(toPlayDraft(playSteps[n] ?? null, playSteps.length + 1))
                    }}
                    disabled={!playSteps.length || selectedStep === 0}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b]"
                  >
                    <ChevronLeftIcon className="size-3.5" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const n = Math.min(selectedStep + 1, Math.max(0, playSteps.length - 1))
                      setSelectedStep(n)
                      setPlayDraft(toPlayDraft(playSteps[n] ?? null, playSteps.length + 1))
                    }}
                    disabled={!playSteps.length || selectedStep >= playSteps.length - 1}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b]"
                  >
                    Next
                    <ChevronRightIcon className="size-3.5" />
                  </button>
                  <span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs text-[#304f86]">
                    Step: {selectedPlay?.trickNo ?? "—"}
                  </span>
                </div>
                <div className="max-h-[320px] overflow-auto rounded-xl border border-[#d8dbe1]">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-[#f2f5fb] text-[#5f6a7b]">
                      <tr>
                        <th className="border-b border-[#d8dbe1] px-2 py-1.5 text-left">Trick</th>
                        <th className="border-b border-[#d8dbe1] px-2 py-1.5 text-left">Leader</th>
                        <th className="border-b border-[#d8dbe1] px-2 py-1.5 text-left">Cards</th>
                        <th className="border-b border-[#d8dbe1] px-2 py-1.5 text-left">Winner</th>
                        <th className="border-b border-[#d8dbe1] px-2 py-1.5 text-left">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playSteps.length ? (
                        playSteps.map((step, i) => (
                          <tr
                            key={`pr-${step.trickNo}`}
                            className={`${i === selectedStep ? "bg-[#edf3ff]" : i % 2 === 0 ? "bg-white" : "bg-[#fbfcff]"} cursor-pointer hover:bg-[#eff4fd]`}
                            onClick={() => {
                              setSelectedStep(i)
                              setPlayDraft(toPlayDraft(step, playSteps.length + 1))
                              setPlayCursor(totalPlayedCards(playSteps.slice(0, i + 1)))
                            }}
                          >
                            <td className="border-t border-[#edf0f5] px-2 py-1.5">{step.trickNo}</td>
                            <td className="border-t border-[#edf0f5] px-2 py-1.5">{step.leader}</td>
                            <td className="border-t border-[#edf0f5] px-2 py-1.5">
                              <span className="inline-flex flex-wrap gap-1">
                                {step.cards.map((card) => (
                                  <span
                                    key={`${step.trickNo}-${card.seat}-${card.suit}-${card.rank}`}
                                    className="rounded bg-[#f2f5fb] px-1.5 py-0.5 text-xs text-[#4f5e78]"
                                  >
                                    {card.seat} {SUIT_META[card.suit].symbol}
                                    {card.rank}
                                  </span>
                                ))}
                              </span>
                            </td>
                            <td className="border-t border-[#edf0f5] px-2 py-1.5">{step.winner ?? "—"}</td>
                            <td className="border-t border-[#edf0f5] px-2 py-1.5 text-xs text-[#6e7788]">{step.note ?? ""}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-2 py-2 text-center text-[#7a8394]">
                            No trick steps yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {playIssues.length ? (
                  <div className="rounded-xl border border-[#f0d8ba] bg-[#fff7ed] p-2.5 text-sm text-[#8a5a1b]">
                    {playIssues.map((issue) => (
                      <p key={issue}>{issue}</p>
                    ))}
                  </div>
                ) : null}
                {canEdit ? (
                  <div className="rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] p-2.5">
                    <div className="grid gap-2 md:grid-cols-4">
                      <input
                        value={playDraft.trickNo}
                        onChange={(event) => {
                          const n = Number(event.target.value)
                          setPlayDraft((prev) => ({ ...prev, trickNo: Number.isNaN(n) ? prev.trickNo : n }))
                        }}
                        className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"
                      />
                      <select
                        value={playDraft.leader}
                        onChange={(event) => setPlayDraft((prev) => ({ ...prev, leader: event.target.value as Seat }))}
                        className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"
                      >
                        {SEATS.map((seat) => (
                          <option key={`pl-${seat}`} value={seat}>
                            Leader: {seat}
                          </option>
                        ))}
                      </select>
                      <select
                        value={playDraft.winner}
                        onChange={(event) => setPlayDraft((prev) => ({ ...prev, winner: event.target.value as Seat | "" }))}
                        className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"
                      >
                        <option value="">Winner: —</option>
                        {SEATS.map((seat) => (
                          <option key={`pw-${seat}`} value={seat}>
                            Winner: {seat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const next = playSteps.length ? Math.max(...playSteps.map((step) => step.trickNo)) + 1 : 1
                          const prev = playSteps.find((step) => step.trickNo === next - 1)
                          setPlayDraft({ ...toPlayDraft(null, next), leader: prev?.winner ?? "W" })
                        }}
                        className="h-9 rounded-lg border border-[#cfd5df] bg-white px-2 text-sm text-[#4f5e78]"
                      >
                        New step
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-4">
                      {SEATS.map((seat) => (
                        <div key={`pc-${seat}`} className="rounded-lg border border-[#d8dbe1] bg-white p-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">{seat}</p>
                          <div className="mt-1 flex gap-1">
                            <select
                              value={playDraft.cards[seat].suit}
                              onChange={(event) =>
                                setPlayDraft((prev) => ({
                                  ...prev,
                                  cards: {
                                    ...prev.cards,
                                    [seat]: { ...prev.cards[seat], suit: event.target.value as Suit },
                                  },
                                }))
                              }
                              className="h-8 w-[64px] rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-1 text-sm"
                            >
                              {SUITS.map((suit) => (
                                <option key={`pcs-${seat}-${suit}`} value={suit}>
                                  {SUIT_META[suit].symbol}
                                </option>
                              ))}
                            </select>
                            <input
                              value={playDraft.cards[seat].rank}
                              onChange={(event) =>
                                setPlayDraft((prev) => ({
                                  ...prev,
                                  cards: {
                                    ...prev.cards,
                                    [seat]: { ...prev.cards[seat], rank: normalizeCards(event.target.value).slice(0, 1) },
                                  },
                                }))
                              }
                              placeholder="A"
                              className="h-8 w-full rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <textarea
                      value={playDraft.note}
                      onChange={(event) => setPlayDraft((prev) => ({ ...prev, note: event.target.value }))}
                      rows={2}
                      placeholder="Step note"
                      className="mt-2 w-full rounded-lg border border-[#d8dbe1] bg-white px-2 py-2 text-sm"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={upsertPlayLocal}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cad8ef] bg-[#e9f0fb] px-2 text-xs font-medium text-[#2f4f86]"
                      >
                        <PlusIcon className="size-3.5" />
                        Upsert step
                      </button>
                      <button
                        type="button"
                        onClick={deleteSelectedPlay}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e8c9d0] bg-[#fff4f6] px-2 text-xs font-medium text-[#8b3240]"
                      >
                        <Trash2Icon className="size-3.5" />
                        Delete selected
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {tab === "dd" ? <div className="mt-3 space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f0f4fb] px-2 py-0.5 text-xs text-[#5f6a7b]">Status: {ddStatus}</span><span className="rounded-full bg-[#f0f4fb] px-2 py-0.5 text-xs text-[#5f6a7b]">Source: {ddSource}</span>{canEdit ? <><button type="button" onClick={runSolverStub} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2 text-xs text-[#5f6a7b]"><SparklesIcon className="size-3.5" />Run solver</button><button type="button" onClick={saveDd} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cad8ef] bg-[#e9f0fb] px-2 text-xs font-medium text-[#2f4f86]"><SaveIcon className="size-3.5" />Save DD</button></> : null}</div><div className="grid gap-2 md:grid-cols-2"><article className="rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] p-2.5"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">Tricks matrix</p><div className="mt-2 overflow-hidden rounded-lg border border-[#d8dbe1] bg-white"><table className="w-full border-collapse text-sm"><thead className="bg-[#f2f5fb] text-[#5f6a7b]"><tr><th className="border-b border-[#d8dbe1] px-2 py-1.5 text-left">Side</th>{DENOMS.map((d)=><th key={`dh-${d}`} className="border-b border-[#d8dbe1] px-2 py-1.5 text-center">{d}</th>)}</tr></thead><tbody>{(["NS","EW"] as const).map((side, idx)=><tr key={`ds-${side}`} className={idx % 2 === 0 ? "bg-white" : "bg-[#fbfcff]"}><td className="border-t border-[#edf0f5] px-2 py-1.5 font-medium text-[#2f466d]">{side}</td>{DENOMS.map((d)=><td key={`dc-${side}-${d}`} className="border-t border-[#edf0f5] px-2 py-1.5 text-center">{canEdit ? <input value={ddMatrix[side][d]} onChange={(e)=>{const n=Number(e.target.value); setDdMatrix((p)=>({...p, [side]: {...p[side], [d]: Number.isNaN(n)?0:Math.max(0, Math.min(13, n))}}))}} className="h-7 w-12 rounded-md border border-[#d8dbe1] bg-[#f8f9fc] px-1 text-center text-sm" /> : ddMatrix[side][d]}</td>)}</tr>)}</tbody></table></div></article><article className="rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] p-2.5"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">Par summary</p><textarea value={ddPar} disabled={!canEdit} onChange={(e) => setDdPar(e.target.value)} rows={4} placeholder="Par contract summary" className="mt-2 w-full rounded-lg border border-[#d8dbe1] bg-white px-2 py-2 text-sm" />{canEdit ? <><textarea value={ddImport} onChange={(e) => setDdImport(e.target.value)} rows={4} placeholder='Paste JSON: {"matrix": {...}, "par": {"text":"..."}}' className="mt-2 w-full rounded-lg border border-[#d8dbe1] bg-white px-2 py-2 font-mono text-xs" /><div className="mt-2 flex gap-1.5"><button type="button" onClick={importDd} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-white px-2 text-xs text-[#5f6a7b]">Import JSON</button><select value={ddSource} onChange={(e) => setDdSource(e.target.value as "solver" | "import")} className="h-8 rounded-lg border border-[#d8dbe1] bg-white px-2 text-xs"><option value="import">Source: import</option><option value="solver">Source: solver</option></select></div></> : null}</article></div>{ddStatus === "loading" ? <p className="inline-flex items-center gap-1 text-sm text-[#5f6a7b]"><LoaderCircleIcon className="size-4 animate-spin" />Fetching solver output...</p> : null}{ddError ? <p className="inline-flex items-center gap-1 rounded-lg bg-[#fff3f5] px-2 py-1 text-sm text-[#8b3240]"><AlertCircleIcon className="size-4" />{ddError}</p> : null}</div> : null}

        {tab === "narrative" ? <div ref={(el) => { refs.current.narrative = el }} className="mt-3"><div className="flex flex-wrap items-center gap-1.5"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70809a]">Anchors</p>{anchors.length ? anchors.map((a) => <button key={a.id} type="button" onClick={() => patchDraft({ narrativeMarkdown: `${draft.narrativeMarkdown}\n[${a.label}](${a.id})`.trim() })} className="rounded-full bg-[#eef2f9] px-2 py-0.5 text-xs text-[#50617d]">{a.label}</button>) : <span className="text-xs text-[#8a93a2]">No anchors yet</span>}<button type="button" onClick={() => setShowHelp((p) => !p)} className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d8dbe1] bg-[#f8f9fc] text-[#5f6a7b]" aria-label="Show narrative help"><CircleHelpIcon className="size-4" /></button></div>{showHelp ? <div className="mt-2 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 py-2 text-xs text-[#5f6a7b]">Use markdown and anchor tokens to connect narrative with auction or play steps.</div> : null}<textarea value={draft.narrativeMarkdown} disabled={!canEdit} onChange={(e) => patchDraft({ narrativeMarkdown: e.target.value })} rows={12} placeholder="Write analysis narrative" className="mt-2 w-full rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] px-3 py-3 text-sm leading-6" />{canEdit ? <div className="mt-2"><button type="button" onClick={saveDraft} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#c7d5ee] bg-[#eaf1fd] px-2 text-xs font-medium text-[#2f4f86]"><SaveIcon className="size-3.5" />Save narrative</button></div> : null}</div> : null}
      </section>

      <section className="border-b border-[#e7ebf2] px-5 py-4">
        <h2 className="text-xl font-semibold text-[#1f2734]">Discussion</h2>
        <p className="text-sm text-[#60708a]">Threaded comments with optional anchors.</p>
        <div className="mt-3 space-y-2">
          {canComment ? <div className="rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] p-2.5"><div className="grid gap-2 md:grid-cols-[170px_minmax(0,1fr)_auto]"><select value={commentAnchorType} onChange={(e) => setCommentAnchorType(e.target.value as "general" | "auction" | "play")} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm"><option value="general">Anchor: general</option><option value="auction">Anchor: auction</option><option value="play">Anchor: play</option></select><input value={commentAnchorRef} onChange={(e) => setCommentAnchorRef(e.target.value)} placeholder={commentAnchorType === "play" ? "trick:3" : "optional ref"} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm" /><button type="button" onClick={() => { setCommentParent(null); setCommentAnchorType("general"); setCommentAnchorRef("") }} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm text-[#5f6a7b]">Clear</button></div><textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} rows={3} placeholder="Write comment" className="mt-2 w-full rounded-lg border border-[#d8dbe1] bg-white px-2 py-2 text-sm" /><div className="mt-2 flex items-center gap-2"><button type="button" onClick={addComment} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cad8ef] bg-[#e9f0fb] px-2 text-xs font-medium text-[#2f4f86]"><MessageSquareIcon className="size-3.5" />Post comment</button>{commentParent ? <span className="text-xs text-[#6e7788]">Replying to {commentParent}</span> : null}</div></div> : <div className="rounded-xl border border-dashed border-[#d8dbe1] bg-white px-3 py-2 text-sm text-[#6e7788]">Sign in with access to comment on this study.</div>}
          <div className="space-y-2">{(commentMap.root ?? []).map((c) => <CommentTree key={c.id} root={c} map={commentMap} onReply={setCommentParent} onAnchor={focusAnchor} />)}{!comments.length ? <div className="rounded-xl border border-dashed border-[#d8dbe1] bg-white px-3 py-6 text-center text-sm text-[#6e7788]">No comments yet.</div> : null}</div>
        </div>
      </section>

      <section className="px-5 py-4">
        <h2 className="text-xl font-semibold text-[#1f2734]">Study polls</h2>
        <p className="text-sm text-[#60708a]">Vote on auction, lead, and play decisions.</p>
        {canCreatePoll ? <div className="mt-3 rounded-xl border border-[#d8dbe1] bg-[#f8f9fc] p-2.5"><div className="grid gap-2 md:grid-cols-[200px_minmax(0,1fr)]"><select value={pollScope} onChange={(e) => setPollScope(e.target.value as PollScope)} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm">{POLL_SCOPES.map((s)=><option key={`ps-${s}`} value={s}>{s}</option>)}</select><input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question" className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm" /></div><div className="mt-2 grid gap-2 md:grid-cols-2">{pollOptions.map((o,i)=><input key={`po-${i}`} value={o} onChange={(e)=>{const next=[...pollOptions]; next[i]=e.target.value; setPollOptions(next)}} placeholder={`Option ${i+1}`} className="h-9 rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm" />)}</div><div className="mt-2 flex flex-wrap gap-1.5">{pollOptions.length < 6 ? <button type="button" onClick={() => setPollOptions((p) => [...p, ""])} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8dbe1] bg-white px-2 text-xs text-[#5f6a7b]"><PlusIcon className="size-3.5" />Add option</button> : null}<button type="button" onClick={createPoll} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cad8ef] bg-[#e9f0fb] px-2 text-xs font-medium text-[#2f4f86]"><VoteIcon className="size-3.5" />Create poll</button></div></div> : null}
        <div className="mt-3 space-y-2">{polls.map((poll) => <article key={poll.id} className="rounded-xl border border-[#d8dbe1] bg-[#fbfcff] p-2.5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] uppercase tracking-[0.08em] text-[#6f7b90]">{poll.scope}</p><p className="text-sm font-semibold text-[#1f2734]">{poll.question}</p></div><div className="flex items-center gap-1.5"><button type="button" onClick={() => focusAnchor({ type: poll.scope === "play" ? "play" : poll.scope === "general" ? "general" : "auction" })} className="rounded-lg border border-[#d8dbe1] bg-white px-2 py-1 text-xs text-[#5f6a7b]">Open context</button><span className={`rounded-full px-2 py-0.5 text-xs ${poll.isClosed ? "bg-[#f2f5fb] text-[#6e7788]" : "bg-[#eaf6ee] text-[#2f6a4a]"}`}>{poll.isClosed ? "Closed" : "Open"}</span>{canCreatePoll ? <button type="button" onClick={() => closePoll(poll.id, !poll.isClosed)} className="rounded-lg border border-[#d8dbe1] bg-white px-2 py-1 text-xs text-[#5f6a7b]">{poll.isClosed ? "Reopen" : "Close"}</button> : null}</div></div><div className="mt-2 space-y-1.5">{poll.options.map((option) => <button key={option.id} type="button" disabled={!canVote || poll.isClosed} onClick={() => votePoll(poll.id, option.id)} className={`w-full rounded-lg border px-2.5 py-2 text-left text-sm ${poll.userVoteOptionId===option.id ? "border-[#b9d2f6] bg-[#eaf2ff]" : "border-[#d8dbe1] bg-white hover:bg-[#f8f9fc]"}`}><div className="flex items-center justify-between gap-2"><span>{option.label}</span><span className="text-xs text-[#6e7788]">{option.votes} · {pct(option.votes, poll.totalVotes)}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#edf1f8]"><span className="block h-full rounded-full bg-[#7fa1d8]" style={{ width: pct(option.votes, poll.totalVotes) }} /></div></button>)}</div></article>)}{!polls.length ? <div className="rounded-xl border border-dashed border-[#d8dbe1] bg-white px-3 py-6 text-center text-sm text-[#6e7788]">No polls yet.</div> : null}</div>
      </section>
      </div>
      <style jsx>{`
        .ds-trick-card {
          min-width: 56px;
          border-radius: 10px;
          border: 1px solid #d8dbe1;
          background: #ffffff;
          padding: 6px 10px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(36, 58, 92, 0.08);
        }

        .ds-trick-enter-n {
          animation: ds-trick-enter-n 0.42s ease-out;
        }
        .ds-trick-enter-e {
          animation: ds-trick-enter-e 0.42s ease-out;
        }
        .ds-trick-enter-s {
          animation: ds-trick-enter-s 0.42s ease-out;
        }
        .ds-trick-enter-w {
          animation: ds-trick-enter-w 0.42s ease-out;
        }
        .ds-winner-pulse {
          animation: ds-winner-pulse 0.7s ease-out;
        }
        .ds-trick-win-banner {
          border-radius: 999px;
          border: 1px solid #bcdac7;
          background: rgba(233, 248, 238, 0.95);
          color: #2f6a4a;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.01em;
          box-shadow: 0 8px 22px rgba(47, 106, 74, 0.14);
          animation: ds-trick-win-banner 0.64s ease-out;
        }

        @keyframes ds-trick-enter-n {
          0% {
            transform: translateY(-16px) scale(0.92);
            opacity: 0.2;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes ds-trick-enter-e {
          0% {
            transform: translateX(16px) scale(0.92);
            opacity: 0.2;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes ds-trick-enter-s {
          0% {
            transform: translateY(16px) scale(0.92);
            opacity: 0.2;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes ds-trick-enter-w {
          0% {
            transform: translateX(-16px) scale(0.92);
            opacity: 0.2;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes ds-winner-pulse {
          0% {
            transform: scale(0.98);
            box-shadow: 0 0 0 0 rgba(123, 182, 144, 0.4);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 12px rgba(123, 182, 144, 0);
          }
        }
        @keyframes ds-trick-win-banner {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
