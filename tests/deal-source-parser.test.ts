import assert from "node:assert/strict"
import test from "node:test"

import { parseBridgeDealSourceUrl } from "../lib/bridge/deal-source-parser"

test("parses BBO handviewer URL into board, dealer, vulnerability, and hands", () => {
  const parsed = parseBridgeDealSourceUrl(
    "https://www.bridgebase.com/tools/handviewer.html?b=1&d=n&v=-&n=sKh632dAKQ952cJ74&e=s6542hAJT754d--cAQ9&s=sQT983h--dT863cK852&w=sAJ7hKQ98dJ74cT63&a=6DDppp",
  )

  assert.ok(parsed)
  assert.equal(parsed.board, "1")
  assert.equal(parsed.dealer, "N")
  assert.equal(parsed.vulnerability, "none")
  assert.equal(parsed.hands.north.spades, "K")
  assert.equal(parsed.hands.north.hearts, "632")
  assert.equal(parsed.hands.north.diamonds, "AKQ952")
  assert.equal(parsed.hands.north.clubs, "J74")
  assert.equal(parsed.hands.east.diamonds, "")
  assert.equal(parsed.hands.south.hearts, "")
  assert.equal(parsed.hands.west.spades, "AJ7")
})

test("returns null for unsupported URLs", () => {
  const parsed = parseBridgeDealSourceUrl("https://example.com/deal/123")
  assert.equal(parsed, null)
})

