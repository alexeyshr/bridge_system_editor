export type BridgeDealSuit = "spades" | "hearts" | "diamonds" | "clubs"

export type BridgeDealHand = Record<BridgeDealSuit, string>

export type BridgeDealHands = {
  north: BridgeDealHand
  east: BridgeDealHand
  south: BridgeDealHand
  west: BridgeDealHand
}

export type ParsedBridgeDealSource = {
  sourceUrl: string
  sourceType: "bbo-handviewer"
  board?: string
  dealer?: "N" | "E" | "S" | "W"
  vulnerability?: "none" | "ns" | "ew" | "all"
  hands: BridgeDealHands
}

const SUIT_TOKENS: Record<string, BridgeDealSuit> = {
  s: "spades",
  h: "hearts",
  d: "diamonds",
  c: "clubs",
}

function emptyHand(): BridgeDealHand {
  return {
    spades: "",
    hearts: "",
    diamonds: "",
    clubs: "",
  }
}

function normalizeCards(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^AKQJT2-9X]/g, "")
    .trim()
}

function parseDotNotationHand(value: string): BridgeDealHand {
  const parts = value.split(".")
  if (parts.length !== 4) return emptyHand()

  return {
    spades: normalizeCards(parts[0] ?? ""),
    hearts: normalizeCards(parts[1] ?? ""),
    diamonds: normalizeCards(parts[2] ?? ""),
    clubs: normalizeCards(parts[3] ?? ""),
  }
}

function parseSuitPrefixedHand(value: string): BridgeDealHand {
  const hand = emptyHand()
  let currentSuit: BridgeDealSuit | null = null
  const raw = value.trim()

  for (const token of raw) {
    const lower = token.toLowerCase()
    if (SUIT_TOKENS[lower]) {
      currentSuit = SUIT_TOKENS[lower]
      continue
    }

    if (!currentSuit) continue
    if (token === "-" || token === "." || token === "|" || token === " " || token === "_") continue

    hand[currentSuit] = `${hand[currentSuit]}${token.toUpperCase()}`
  }

  for (const suit of Object.keys(hand) as BridgeDealSuit[]) {
    hand[suit] = normalizeCards(hand[suit] ?? "")
  }

  return hand
}

function parseBboHand(value: string | null): BridgeDealHand {
  if (!value) return emptyHand()
  const trimmed = value.trim()
  if (!trimmed) return emptyHand()
  if (trimmed.includes(".") && !/[shdc]/i.test(trimmed)) {
    return parseDotNotationHand(trimmed)
  }
  return parseSuitPrefixedHand(trimmed)
}

function hasAnyCards(hand: BridgeDealHand): boolean {
  return Object.values(hand).some((cards) => Boolean(cards.trim()))
}

function parseDealer(value: string | null): "N" | "E" | "S" | "W" | undefined {
  const raw = value?.trim().toLowerCase()
  if (raw === "n") return "N"
  if (raw === "e") return "E"
  if (raw === "s") return "S"
  if (raw === "w") return "W"
  return undefined
}

function parseVulnerability(value: string | null): "none" | "ns" | "ew" | "all" | undefined {
  const raw = value?.trim().toLowerCase()
  if (!raw || raw === "-" || raw === "none" || raw === "0") return "none"
  if (raw === "n" || raw === "ns") return "ns"
  if (raw === "e" || raw === "ew") return "ew"
  if (raw === "b" || raw === "all" || raw === "both" || raw === "a") return "all"
  return undefined
}

function isBboHandviewerUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  if (!(host === "bridgebase.com" || host === "www.bridgebase.com")) return false
  return url.pathname.toLowerCase().includes("/tools/handviewer.html")
}

export function parseBridgeDealSourceUrl(input: string): ParsedBridgeDealSource | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (!isBboHandviewerUrl(url)) return null

  const north = parseBboHand(url.searchParams.get("n"))
  const east = parseBboHand(url.searchParams.get("e"))
  const south = parseBboHand(url.searchParams.get("s"))
  const west = parseBboHand(url.searchParams.get("w"))

  const hasAnyHandCards = [north, east, south, west].some((hand) => hasAnyCards(hand))
  if (!hasAnyHandCards) return null

  const boardRaw = url.searchParams.get("b")?.trim()
  const board = boardRaw ? boardRaw : undefined

  return {
    sourceUrl: url.toString(),
    sourceType: "bbo-handviewer",
    board,
    dealer: parseDealer(url.searchParams.get("d")),
    vulnerability: parseVulnerability(url.searchParams.get("v")),
    hands: {
      north,
      east,
      south,
      west,
    },
  }
}

