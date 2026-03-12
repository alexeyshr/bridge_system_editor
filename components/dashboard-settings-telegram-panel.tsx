"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Link2OffIcon,
  Loader2Icon,
  MessageCircleIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type TelegramAuthUser = {
  id: number | string
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number | string
  hash: string
}

type TelegramLinkState = {
  linked: boolean
  telegramUserId: string | null
  telegramUsername: string | null
}

type TelegramLinkPanelProps = {
  isGuest: boolean
  isAuthLoading?: boolean
}

declare global {
  interface Window {
    BridgeTelegramLinkAuth?: (user: TelegramAuthUser) => void
  }
}

async function parseApiMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string }
    return data.message ?? ""
  } catch {
    return ""
  }
}

function TelegramSettingsLoadingIndicator() {
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="relative inline-flex size-11 items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-2 border-[#2d3c5f]/25 border-t-[#2d3c5f] motion-safe:animate-[spin_1.2s_linear_infinite]" />
        <span className="relative inline-flex size-8 items-center justify-center rounded-full border-2 border-[#4b4f57] bg-white text-[18px] leading-none text-[#2f3f61] motion-safe:animate-[pulse_1.25s_ease-in-out_infinite]">
          {"\u2663"}
        </span>
        <span className="absolute right-0 top-0 size-2 rounded-full bg-[#b32d32] motion-safe:animate-pulse" />
      </span>
      <div>
        <p className="text-sm font-medium text-[#38485f]">Loading account status...</p>
        <p className="text-xs text-[#6e7788]">Checking Telegram link and profile state.</p>
      </div>
    </div>
  )
}

export function DashboardSettingsTelegramPanel({ isGuest, isAuthLoading = false }: TelegramLinkPanelProps) {
  const router = useRouter()
  const telegramContainerRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [linkState, setLinkState] = useState<TelegramLinkState | null>(null)
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [infoMessage, setInfoMessage] = useState("")
  const telegramBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim() ?? ""
  const telegramEnabled = telegramBotName.length > 0
  const backIconButtonClassName =
    "inline-flex size-8 items-center justify-center rounded-lg border border-[#cfd5df] bg-transparent text-[#5d6a80] transition-colors hover:bg-[#edf2fa] hover:text-[#1f2734] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa5bb]"
  const subtleActionClassName =
    "border-[#cfd5df] bg-transparent text-[#344863] shadow-none transition-colors hover:bg-[#edf2fa] hover:text-[#1f2734]"

  const loadState = useCallback(async (announceResult = false) => {
    if (isGuest || isAuthLoading) return
    setIsLoading(true)
    setErrorMessage("")
    if (announceResult) {
      setInfoMessage("")
    }

    try {
      const response = await fetch("/api/auth/link/telegram", { cache: "no-store" })
      if (!response.ok) {
        const message = await parseApiMessage(response)
        setErrorMessage(message || "Failed to load Telegram link status.")
        return
      }

      const payload = (await response.json()) as TelegramLinkState
      setLinkState(payload)
      if (!payload.linked) {
        setIsConfirmingUnlink(false)
      }
      if (announceResult) {
        setInfoMessage(
          payload.linked
            ? "Status refreshed: Telegram is linked."
            : "Status refreshed: Telegram is not linked yet."
        )
      }
    } catch {
      setErrorMessage("Failed to load Telegram link status.")
    } finally {
      setIsLoading(false)
    }
  }, [isGuest, isAuthLoading])

  const runTelegramLink = useCallback(async (user: TelegramAuthUser) => {
    const payload = {
      id: user?.id ? String(user.id) : "",
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      username: user?.username ?? "",
      photo_url: user?.photo_url ?? "",
      auth_date: user?.auth_date ? String(user.auth_date) : "",
      hash: user?.hash ? String(user.hash) : "",
    }

    if (!payload.id || !payload.auth_date || !payload.hash) {
      setErrorMessage("Telegram payload is incomplete.")
      return
    }

    setIsLoading(true)
    setErrorMessage("")
    setInfoMessage("Verifying Telegram account...")

    try {
      const response = await fetch("/api/auth/link/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message = await parseApiMessage(response)
        setInfoMessage("")
        setErrorMessage(message || "Failed to link Telegram account.")
        return
      }

      const data = (await response.json()) as TelegramLinkState
      setLinkState(data)
      setInfoMessage("Telegram account is linked.")
    } catch {
      setInfoMessage("")
      setErrorMessage("Failed to link Telegram account.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleUnlink = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")
    setInfoMessage("")

    try {
      const response = await fetch("/api/auth/link/telegram", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const message = await parseApiMessage(response)
        setErrorMessage(message || "Failed to unlink Telegram account.")
        return false
      }

      const data = (await response.json()) as TelegramLinkState
      setLinkState(data)
      setIsConfirmingUnlink(false)
      setInfoMessage("Telegram account is unlinked.")
      return true
    } catch {
      setErrorMessage("Failed to unlink Telegram account.")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isGuest || isAuthLoading) return
    void loadState(false)
  }, [isGuest, isAuthLoading, loadState])

  useEffect(() => {
    const handler = (user: TelegramAuthUser) => {
      void runTelegramLink(user)
    }

    window.BridgeTelegramLinkAuth = handler
    return () => {
      delete window.BridgeTelegramLinkAuth
    }
  }, [runTelegramLink])

  const linked = Boolean(linkState?.linked)
  const showTelegramWidget = telegramEnabled

  useEffect(() => {
    if (!showTelegramWidget || isGuest || isAuthLoading) return
    if (!telegramContainerRef.current) return

    const host = telegramContainerRef.current
    host.innerHTML = ""

    const script = document.createElement("script")
    script.async = true
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", telegramBotName)
    script.setAttribute("data-size", "large")
    script.setAttribute("data-userpic", "false")
    script.setAttribute("data-radius", "8")
    script.setAttribute("data-request-access", "write")
    script.setAttribute("data-onauth", "BridgeTelegramLinkAuth(user)")
    host.appendChild(script)

    return () => {
      host.innerHTML = ""
    }
  }, [telegramBotName, showTelegramWidget, isGuest, isAuthLoading])

  if (isAuthLoading) {
    return (
      <section className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-[#1f2734]">Account settings</h1>
        <TelegramSettingsLoadingIndicator />
      </section>
    )
  }

  if (isGuest) {
    return (
      <section className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-[#1f2734]">Account settings</h1>
        <p className="mt-2 text-sm text-[#6e7788]">
          Sign in first, then link your Telegram account.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/auth/signin?callbackUrl=/dashboard/settings"
            className="inline-flex h-8 items-center rounded-lg border border-[#cfd5df] bg-white px-3 text-sm font-medium text-[#1f2734] transition-colors hover:bg-[#edf2fa]"
          >
            Go to sign in
          </Link>
          <Button
            type="button"
            variant="ghost"
            className={backIconButtonClassName}
            aria-label="Close settings and go to dashboard"
            title="Back to dashboard"
            onClick={() => {
              router.push("/dashboard")
            }}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1f2734]">Account settings</h1>
          <p className="mt-1 text-sm text-[#6e7788]">
            Link Telegram once, then use Telegram sign-in on the auth page.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className={backIconButtonClassName}
          aria-label="Close settings and go to dashboard"
          title="Back to dashboard"
          onClick={() => {
            router.push("/dashboard")
          }}
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#1f2734]">
            <MessageCircleIcon className="size-4" />
            <p className="text-sm font-semibold">Telegram sign-in</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
              linked
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-[#d8dbe1] bg-white text-[#6e7788]"
            }`}
          >
            {linked ? <CheckCircle2Icon className="size-3.5" /> : <ShieldCheckIcon className="size-3.5" />}
            {linked ? "Linked" : "Not linked"}
          </span>
        </div>

        {linked ? (
          <div className="mt-2 text-xs text-[#5f6a7d]">
            <p>
              Telegram ID:
              {" "}
              <span className="font-medium text-[#1f2734]">{linkState?.telegramUserId ?? "—"}</span>
            </p>
            <p className="mt-1">
              Username:
              {" "}
              <span className="font-medium text-[#1f2734]">
                {linkState?.telegramUsername ? `@${linkState.telegramUsername}` : "not set"}
              </span>
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#5f6a7d]">
            Link Telegram here to enable strict Telegram login for this account.
          </p>
        )}

        {showTelegramWidget ? (
          <div className="mt-3">
            <div ref={telegramContainerRef} className="min-h-10" />
            <p className="mt-2 text-[11px] text-[#6e7788]">
              {linked
                ? "Confirm Telegram auth again to update linked profile data."
                : "Authorize via Telegram to link this account."}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[#6e7788]">
            Set
            {" "}
            <code className="rounded bg-white px-1 py-0.5 text-[11px]">NEXT_PUBLIC_TELEGRAM_BOT_NAME</code>
            {" "}
            to show Telegram widget.
          </p>
        )}

        {telegramEnabled ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => {
                void loadState(true)
              }}
              className={subtleActionClassName}
            >
              {isLoading ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <RefreshCcwIcon data-icon="inline-start" />}
              Refresh status
            </Button>
            {linked ? (
              isConfirmingUnlink ? (
                <div className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1">
                  <p className="text-xs font-medium text-red-700">Unlink Telegram account?</p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => {
                      setIsConfirmingUnlink(false)
                      setInfoMessage("")
                      setErrorMessage("")
                    }}
                    className="h-7 border-red-200 bg-white px-2 text-xs text-red-700 shadow-none hover:bg-red-100 hover:text-red-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => {
                      void handleUnlink()
                    }}
                    className="h-7 border-red-300 bg-transparent px-2 text-xs text-red-700 shadow-none hover:bg-red-100 hover:text-red-800"
                  >
                    <Link2OffIcon data-icon="inline-start" />
                    Unlink now
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => {
                    setInfoMessage("")
                    setErrorMessage("")
                    setIsConfirmingUnlink(true)
                  }}
                  className="border-red-200 bg-transparent text-red-700 shadow-none transition-colors hover:bg-red-50 hover:text-red-800"
                >
                  <Link2OffIcon data-icon="inline-start" />
                  Unlink Telegram
                </Button>
              )
            ) : null}
          </div>
        ) : null}

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
