"use client"

import * as React from "react"
import Link from "next/link"
import {
  BellRingIcon,
  LoaderCircleIcon,
  SearchIcon,
  TrophyIcon,
  UserIcon,
  XIcon,
} from "lucide-react"

import type { GlobalSearchResponse } from "@/lib/portal-search"
import { cn } from "@/lib/utils"

type TopbarGlobalSearchProps = {
  className?: string
  placeholder?: string
}

function buildResultCount(results: GlobalSearchResponse | null) {
  if (!results) return 0
  return results.users.length + results.tournaments.length + results.posts.length
}

export function TopbarGlobalSearch({
  className,
  placeholder = "Search portal...",
}: TopbarGlobalSearchProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorText, setErrorText] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<GlobalSearchResponse | null>(null)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const trimmedQuery = query.trim()
  const totalCount = buildResultCount(results)

  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    if (!isOpen || trimmedQuery.length < 2) {
      setResults(null)
      setErrorText(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true)
        setErrorText(null)
        const response = await fetch(`/api/search/global?q=${encodeURIComponent(trimmedQuery)}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Search request failed")
        }

        const payload = (await response.json()) as GlobalSearchResponse
        setResults(payload)
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        setResults(null)
        setErrorText("Search is temporarily unavailable")
      } finally {
        setIsLoading(false)
      }
    }, 220)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [isOpen, trimmedQuery])

  React.useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener("mousedown", onMouseDown)
    return () => window.removeEventListener("mousedown", onMouseDown)
  }, [])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center rounded-xl transition-all duration-200",
          isOpen
            ? "w-[290px] border border-[#cfd5df] bg-white/95 px-2 py-1 shadow-sm"
            : "w-9 justify-center border border-transparent bg-transparent p-0 shadow-none"
        )}
      >
        <button
          type="button"
          aria-label="Open global search"
          title="Global search"
          className="inline-flex size-7 items-center justify-center rounded-lg text-[#4b566a] transition-colors hover:bg-[#edf2fa]"
          onClick={() => setIsOpen(true)}
        >
          <SearchIcon className="size-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "h-7 bg-transparent text-sm text-[#1f2734] outline-none placeholder:text-[#7b8392] transition-all",
            isOpen ? "ml-1 w-full opacity-100" : "w-0 opacity-0"
          )}
          aria-hidden={!isOpen}
          tabIndex={isOpen ? 0 : -1}
        />

        {isOpen ? (
          <button
            type="button"
            aria-label="Close global search"
            title="Close search"
            className="inline-flex size-7 items-center justify-center rounded-lg text-[#6f7a8d] transition-colors hover:bg-[#edf2fa]"
            onClick={() => {
              setIsOpen(false)
              setQuery("")
              setResults(null)
            }}
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-xl border border-[#cfd5df] bg-white/98 p-1.5 text-[#1f2734] shadow-[0_14px_40px_-20px_rgba(15,23,42,0.85)]">
          {trimmedQuery.length < 2 ? (
            <p className="rounded-lg bg-[#f7f9fd] px-3 py-2 text-sm text-[#6e7788]">
              Type at least 2 characters to search.
            </p>
          ) : null}

          {trimmedQuery.length >= 2 && isLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-[#f7f9fd] px-3 py-2 text-sm text-[#6e7788]">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Searching...
            </div>
          ) : null}

          {trimmedQuery.length >= 2 && !isLoading && errorText ? (
            <p className="rounded-lg bg-[#fff3f1] px-3 py-2 text-sm text-[#9f3d34]">
              {errorText}
            </p>
          ) : null}

          {trimmedQuery.length >= 2 && !isLoading && !errorText && results ? (
            <div className="space-y-2">
              {results.users.length > 0 ? (
                <div className="rounded-lg border border-[#e2e7f0] bg-[#fafbfe] p-1">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#768399]">
                    Users
                  </p>
                  {results.users.map((user) => (
                    <Link
                      key={user.id}
                      href={user.href}
                      className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[#e7eefb]"
                      onClick={() => setIsOpen(false)}
                    >
                      <UserIcon className="mt-0.5 size-4 text-[#596b87]" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[#1f2734]">{user.label}</span>
                        <span className="block truncate text-xs text-[#6e7788]">{user.subtitle}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {results.tournaments.length > 0 ? (
                <div className="rounded-lg border border-[#e2e7f0] bg-[#fafbfe] p-1">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#768399]">
                    Tournaments
                  </p>
                  {results.tournaments.map((tournament) => (
                    <Link
                      key={tournament.id}
                      href={tournament.href}
                      className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[#e7eefb]"
                      onClick={() => setIsOpen(false)}
                    >
                      <TrophyIcon className="mt-0.5 size-4 text-[#596b87]" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[#1f2734]">
                          {tournament.label}
                        </span>
                        <span className="block truncate text-xs text-[#6e7788]">
                          {tournament.subtitle}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {results.posts.length > 0 ? (
                <div className="rounded-lg border border-[#e2e7f0] bg-[#fafbfe] p-1">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#768399]">
                    Posts
                  </p>
                  {results.posts.map((post) => (
                    <Link
                      key={post.id}
                      href={post.href}
                      className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[#e7eefb]"
                      onClick={() => setIsOpen(false)}
                    >
                      <BellRingIcon className="mt-0.5 size-4 text-[#596b87]" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[#1f2734]">{post.label}</span>
                        <span className="block truncate text-xs text-[#6e7788]">{post.subtitle}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {totalCount === 0 ? (
                <p className="rounded-lg bg-[#f7f9fd] px-3 py-2 text-sm text-[#6e7788]">
                  No results found for &quot;{trimmedQuery}&quot;.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
