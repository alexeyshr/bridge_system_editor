"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  Link2OffIcon,
  Loader2Icon,
  SearchIcon,
  UserIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type PlayerLinkState = {
  linked: boolean
  playerId: number | null
  playerName: string | null
  city: string | null
  rank: string | null
  rating: number | null
  profileUrl: string | null
}

type SearchResult = {
  sourcePlayerId: number
  name: string
  city: string | null
  rank: string | null
  rating: number | null
}

type Props = {
  isGuest: boolean
  isAuthLoading?: boolean
}

export function DashboardSettingsPlayerPanel({ isGuest, isAuthLoading = false }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [linkState, setLinkState] = useState<PlayerLinkState | null>(null)
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [infoMessage, setInfoMessage] = useState("")

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const loadState = useCallback(async () => {
    if (isGuest || isAuthLoading) return
    setIsLoading(true)
    setErrorMessage("")
    try {
      const res = await fetch("/api/auth/link/player", { cache: "no-store" })
      if (!res.ok) { setErrorMessage("Failed to load player link status."); return }
      const data = (await res.json()) as PlayerLinkState
      setLinkState(data)
      if (!data.linked) setIsConfirmingUnlink(false)
    } catch {
      setErrorMessage("Failed to load player link status.")
    } finally {
      setIsLoading(false)
    }
  }, [isGuest, isAuthLoading])

  const handleLink = useCallback(async (playerId: number) => {
    setIsLoading(true)
    setErrorMessage("")
    setInfoMessage("")
    try {
      const res = await fetch("/api/auth/link/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorMessage(data?.message ?? "Failed to link player.")
        return
      }
      const data = (await res.json()) as PlayerLinkState
      setLinkState(data)
      setInfoMessage("Player linked successfully!")
      setSearchQuery("")
      setSearchResults([])
      setShowResults(false)
    } catch {
      setErrorMessage("Failed to link player.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleUnlink = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")
    setInfoMessage("")
    try {
      const res = await fetch("/api/auth/link/player", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) { setErrorMessage("Failed to unlink player."); return }
      const data = (await res.json()) as PlayerLinkState
      setLinkState(data)
      setIsConfirmingUnlink(false)
      setInfoMessage("Player unlinked.")
    } catch {
      setErrorMessage("Failed to unlink player.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Live search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    const q = searchQuery.trim()
    if (q.length < 2) { setSearchResults([]); setShowResults(false); return }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}&limit=8`)
        if (res.ok) {
          const data = await res.json()
          const items = (data.rows ?? data.items ?? data.players ?? data) as SearchResult[]
          setSearchResults(Array.isArray(items) ? items : [])
          setShowResults(true)
        }
      } catch { /* ignore */ } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery])

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (isGuest || isAuthLoading) return
    void loadState()
  }, [isGuest, isAuthLoading, loadState])

  if (isAuthLoading || isGuest) return null

  const linked = Boolean(linkState?.linked)

  return (
    <section className="mt-4 rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1f2734]">Bridge player profile</h2>
          <p className="mt-0.5 text-sm text-[#6e7788]">
            Link your account to your Bridgesport player card to display rating and stats.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#1f2734]">
            <UserIcon className="size-4" />
            <p className="text-sm font-semibold">Bridgesport profile</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
              linked
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-[#d8dbe1] bg-white text-[#6e7788]"
            }`}
          >
            {linked ? <CheckCircle2Icon className="size-3.5" /> : <UserIcon className="size-3.5" />}
            {linked ? "Linked" : "Not linked"}
          </span>
        </div>

        {linked && linkState ? (
          <>
            <div className="mt-3 rounded-md border border-[#e5e7eb] bg-white p-3">
              <p className="text-sm font-medium text-[#1f2734]">{linkState.playerName}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#6e7788]">
                {linkState.city ? <span>{linkState.city}</span> : null}
                {linkState.rating ? <span>Rating: <span className="font-medium text-[#1f2734]">{linkState.rating}</span></span> : null}
                {linkState.rank && linkState.rank !== "0" ? <span>Rank: {linkState.rank}</span> : null}
              </div>
              {linkState.profileUrl ? (
                <a
                  href={linkState.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLinkIcon className="size-3" />
                  View on Bridgesport
                </a>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isConfirmingUnlink ? (
                <div className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1">
                  <p className="text-xs font-medium text-red-700">Unlink player?</p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => { setIsConfirmingUnlink(false); setErrorMessage(""); setInfoMessage("") }}
                    className="h-7 border-red-200 bg-white px-2 text-xs text-red-700 shadow-none hover:bg-red-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => void handleUnlink()}
                    className="h-7 border-red-300 bg-transparent px-2 text-xs text-red-700 shadow-none hover:bg-red-100"
                  >
                    <Link2OffIcon data-icon="inline-start" />
                    Unlink
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => { setIsConfirmingUnlink(true); setErrorMessage(""); setInfoMessage("") }}
                  className="border-red-200 bg-transparent text-red-700 shadow-none hover:bg-red-50"
                >
                  <Link2OffIcon data-icon="inline-start" />
                  Unlink player
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="relative mt-3" ref={panelRef}>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowResults(true) }}
                placeholder="Search by player name..."
                className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white pl-8 pr-8 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
              />
              {isSearching ? (
                <Loader2Icon className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-[#9ca3af]" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9ca3af] hover:text-[#1f2734]"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </div>

            {showResults && searchResults.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-lg border border-[#d8dbe1] bg-white shadow-lg">
                {searchResults.map((p) => (
                  <button
                    key={p.sourcePlayerId}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void handleLink(p.sourcePlayerId)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-[#f3f4f6] disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-[#1f2734]">{p.name}</p>
                      <p className="text-xs text-[#6e7788]">
                        {[p.city, p.rating ? `Rating: ${p.rating}` : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded border border-[#d8dbe1] px-2 py-0.5 text-[10px] font-medium text-[#6e7788] hover:border-emerald-300 hover:text-emerald-700">
                      Link
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {showResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching ? (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-[#d8dbe1] bg-white px-3 py-3 text-center text-xs text-[#6e7788] shadow-lg">
                No players found for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : null}
          </div>
        )}

        {errorMessage ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
            <AlertCircleIcon className="size-3.5" />
            {errorMessage}
          </p>
        ) : null}
        {infoMessage ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
            <CheckCircle2Icon className="size-3.5" />
            {infoMessage}
          </p>
        ) : null}
      </div>
    </section>
  )
}
