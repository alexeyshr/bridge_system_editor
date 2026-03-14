# UI Contract: Deal Study Workspace

Spec: `specs/015-deal-study-workspace-and-interactive-analysis/spec.md`

## Layout Contract

- Root:
  - single central rail, no dashboard cards
  - `max-width: 1040px`
  - spacing rhythm: 8/12/16/24
- Section order:
  1. `DealHeader`
  2. `HandsCompassEditor`
  3. `AuctionBuilder` + `LeadPicker`
  4. `AnalysisTabs` (`Play`, `DoubleDummy`, `Narrative`)
  5. `DiscussionThread`
  6. `StudyPolls`

## Components

## 1) DealHeader

Purpose:
- identify study and expose top-level actions.

Props:
```ts
type DealHeaderProps = {
  title: string
  board?: string | null
  contractLabel?: string | null
  resultLabel?: string | null
  isSaving: boolean
  canEdit: boolean
  canPublish: boolean
  onSave: () => void
  onPublish: () => void
  onShare: () => void
}
```

Behavior:
- sticky inside viewport top offset,
- compact metadata chips,
- disable publish when policy conflict exists.

## 2) HandsCompassEditor

Purpose:
- capture and edit four hands by seat and suit.

Props:
```ts
type Seat = "W" | "N" | "E" | "S"
type Suit = "S" | "H" | "D" | "C"

type HandCards = Record<Suit, string>
type DealHands = Record<Seat, HandCards>

type VisibilityMask = {
  hiddenSeats: Seat[]
  hiddenCards: Array<{ seat: Seat; suit: Suit; rank: string }>
}

type HandsCompassEditorProps = {
  value: DealHands
  mask: VisibilityMask
  canEdit: boolean
  mode: "quick" | "picker"
  onModeChange: (mode: "quick" | "picker") => void
  onChange: (next: DealHands) => void
  onMaskChange: (next: VisibilityMask) => void
  onParseLink?: (url: string) => void
  validationIssues: string[]
}
```

Behavior:
- show compass layout (`N` top, `S` bottom, `W/E` sides),
- quick mode accepts text patterns (`AKQJ`, `T98`, `-`),
- picker mode allows suit/rank clicks,
- inline errors for duplicate or invalid cards.

## 3) AuctionBuilder

Purpose:
- ergonomic auction entry with seat order.

Props:
```ts
type AuctionCall = "P" | "X" | "XX" | `${1|2|3|4|5|6|7}${"C"|"D"|"H"|"S"|"NT"}`

type AuctionBuilderProps = {
  startingSeat: Seat
  sequence: AuctionCall[]
  canEdit: boolean
  quickInput: string
  onStartingSeatChange: (seat: Seat) => void
  onQuickInputChange: (value: string) => void
  onQuickInputCommit: () => void
  onAddCall: (call: AuctionCall) => void
  onUndo: () => void
  onClear: () => void
}
```

Behavior:
- keep both modes in sync,
- render W/N/E/S table by rounds,
- highlight next seat to call.

## 4) LeadPicker

Purpose:
- set opening lead explicitly.

Props:
```ts
type LeadPickerProps = {
  leadSuit: Suit | null
  leadRank: string | null
  canEdit: boolean
  onChange: (next: { leadSuit: Suit | null; leadRank: string | null }) => void
}
```

## 5) PlayTimelinePanel

Purpose:
- record and replay trick-by-trick play.

Props:
```ts
type TrickCard = { seat: Seat; suit: Suit; rank: string }

type TrickStep = {
  trickNo: number
  leader: Seat
  cards: TrickCard[]
  winner: Seat | null
  note?: string | null
}

type PlayTimelinePanelProps = {
  steps: TrickStep[]
  canEdit: boolean
  currentIndex: number
  onSelectIndex: (index: number) => void
  onAddStep: (step: TrickStep) => void
  onUpdateStep: (index: number, step: TrickStep) => void
  onDeleteStep: (index: number) => void
}
```

## 6) DoubleDummyPanel

Purpose:
- display DD matrix and par summary.

Props:
```ts
type DdMatrix = Record<"NS"|"EW", Record<"C"|"D"|"H"|"S"|"NT", number>>

type DoubleDummyPanelProps = {
  status: "idle" | "loading" | "ready" | "error"
  matrix: DdMatrix | null
  parText: string | null
  source: "solver" | "import" | null
  canEdit: boolean
  onRun?: () => void
  onImport?: (payload: unknown) => void
}
```

## 7) NarrativeComposer

Purpose:
- write structured explanation linked to study context.

Props:
```ts
type NarrativeComposerProps = {
  markdown: string
  canEdit: boolean
  onChange: (value: string) => void
  anchors: Array<{ id: string; label: string }>
}
```

Behavior:
- supports headings/lists/callouts/code/links,
- supports anchor insertion to auction call or trick index.

## 8) DiscussionThread

Purpose:
- threaded analysis discussion.

Props:
```ts
type DiscussionThreadProps = {
  contentId: string
  canComment: boolean
  canModerate: boolean
}
```

Behavior:
- nested replies,
- formatted comments,
- optional labels (`insight`, `question`, `dispute`).

## 9) StudyPolls

Purpose:
- decision polls for auction/lead/play scenarios.

Props:
```ts
type PollScope = "auction" | "lead" | "play" | "general"

type StudyPollsProps = {
  contentId: string
  canCreate: boolean
  canVote: boolean
}
```

Behavior:
- create poll with 2-6 options,
- one vote per user per poll,
- show totals and percentages.

## Design Tokens and Interaction Rules

- Inputs: rounded (`10-12px` radius), compact height (`36-40px`).
- Section cards: very light background contrast; avoid heavy borders.
- Hover states: subtle tint only, no strong shadows.
- Sticky header and sticky table headers where needed.
- Empty states should be contextual and action-oriented.

## Accessibility Requirements

- keyboard path for all bid and card actions,
- focus ring visible on every interactive element,
- aria labels for suit/rank/action buttons,
- contrast ratio >= WCAG AA for text and control states.
