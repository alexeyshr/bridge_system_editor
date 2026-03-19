"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  BookOpenIcon,
  CalendarIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  MapPinIcon,
  SettingsIcon,
  StarIcon,
  TrophyIcon,
  UserIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFaviconToggle } from "@/components/dashboard-favicon-toggle"
import { TopbarGlobalSearch } from "@/components/topbar-global-search"
import { TopbarNotifications } from "@/components/topbar-notifications"
import { TopbarUserMenu } from "@/components/topbar-user-menu"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

type ProfileData = {
  user: {
    id: string
    email: string | null
    displayName: string | null
    telegramUsername: string | null
    createdAt: string | null
  }
  player: {
    sourcePlayerId: number
    name: string
    city: string | null
    rank: string | null
    rating: number | null
    ratingPosition: number | null
    maxRatingPosition: number | null
    prizePoints: number | null
    masterPoints: number | null
    onlineMasterPoints: number | null
    gamblerNick: string | null
    bboNick: string | null
    club: string | null
    tournamentsCount: number | null
    profileUrl: string | null
  } | null
  stats: {
    publishedContent: number
    biddingSystems: number
    tournaments: number
  }
  recentContent: Array<{
    id: string
    title: string
    format: string
    publishedAt: string | null
    coverImageUrl: string | null
  }>
  systems: Array<{
    id: string
    title: string
    description: string | null
    updatedAt: string | null
  }>
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f6] text-[#6b7280]">
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-[#1f2734] leading-tight">{value}</p>
        <p className="text-[11px] text-[#9ca3af]">{label}</p>
      </div>
    </div>
  )
}

function ProfileContent({ data }: { data: ProfileData }) {
  const { user, player, stats, recentContent, systems } = data
  const initials = (user.displayName ?? user.email ?? "U").slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-[#d8dbe1] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          {player?.sourcePlayerId ? (
            <img
              src={`https://db.bridgesport.ru/foto/${player.sourcePlayerId}.jpg`}
              alt={player.name ?? ""}
              className="size-16 shrink-0 rounded-full object-cover border-2 border-[#e5e7eb]"
              onError={(e) => {
                const el = e.currentTarget
                el.style.display = "none"
                const fallback = el.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = "flex"
              }}
            />
          ) : null}
          <div
            className={`size-16 shrink-0 items-center justify-center rounded-full bg-[#1f2734] text-xl font-bold text-white ${player?.sourcePlayerId ? "hidden" : "flex"}`}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#1f2734]">
                  {player?.name ?? user.displayName ?? "User"}
                </h1>
                <p className="mt-0.5 text-sm text-[#6e7788]">{user.email}</p>
                {player?.city ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#9ca3af]">
                    <MapPinIcon className="size-3" />
                    {player.city}
                    {player.club ? <span> · {player.club}</span> : null}
                  </p>
                ) : null}
              </div>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-1 rounded-md border border-[#d8dbe1] px-2.5 py-1.5 text-xs font-medium text-[#6e7788] transition hover:bg-[#f3f4f6] hover:text-[#1f2734]"
              >
                <SettingsIcon className="size-3" />
                Settings
              </Link>
            </div>

            {/* Nicks */}
            {(player?.gamblerNick || player?.bboNick || user.telegramUsername) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {player?.gamblerNick ? (
                  <span className="rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2 py-0.5 text-[11px] text-[#6e7788]">
                    Gambler: <span className="font-medium text-[#1f2734]">{player.gamblerNick}</span>
                  </span>
                ) : null}
                {player?.bboNick ? (
                  <span className="rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2 py-0.5 text-[11px] text-[#6e7788]">
                    BBO: <span className="font-medium text-[#1f2734]">{player.bboNick}</span>
                  </span>
                ) : null}
                {user.telegramUsername ? (
                  <span className="rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2 py-0.5 text-[11px] text-[#6e7788]">
                    Telegram: <span className="font-medium text-[#1f2734]">@{user.telegramUsername}</span>
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Bridgesport link */}
            {player?.profileUrl ? (
              <a
                href={player.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <ExternalLinkIcon className="size-3" />
                Bridgesport profile
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Player stats & portal activity */}
      {player ? (
        <div className="rounded-xl border border-[#d8dbe1] bg-white shadow-sm overflow-hidden">
          {/* Rating hero row */}
          <div className="flex items-stretch border-b border-[#e5e7eb]">
            <div className="flex flex-1 flex-col items-center justify-center border-r border-[#e5e7eb] py-5">
              <p className="text-3xl font-bold text-[#1f2734]">{player.rating ?? "—"}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[#9ca3af]">Rating</p>
              {player.ratingPosition ? (
                <p className="mt-1 text-xs text-[#6e7788]">#{player.ratingPosition} in Russia</p>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col items-center justify-center border-r border-[#e5e7eb] py-5">
              <p className="text-3xl font-bold text-[#1f2734]">{stats.tournaments || "—"}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[#9ca3af]">Tournaments</p>
              {player.maxRatingPosition ? (
                <p className="mt-1 text-xs text-[#6e7788]">Best: #{player.maxRatingPosition}</p>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-5">
              <p className="text-3xl font-bold text-[#1f2734]">{player.rank && player.rank !== "0" ? player.rank : "—"}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[#9ca3af]">Rank</p>
            </div>
          </div>

          {/* Points row */}
          <div className="grid grid-cols-2 gap-px bg-[#e5e7eb] sm:grid-cols-4">
            {[
              { label: "Master pts", value: player.masterPoints, icon: <StarIcon className="size-3.5 text-amber-500" /> },
              { label: "Online pts", value: player.onlineMasterPoints, icon: <StarIcon className="size-3.5 text-blue-400" /> },
              { label: "Prize pts", value: player.prizePoints, icon: <TrophyIcon className="size-3.5 text-emerald-500" /> },
              { label: "Articles", value: stats.publishedContent, icon: <FileTextIcon className="size-3.5 text-violet-400" /> },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 bg-white px-4 py-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#f3f4f6]">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1f2734]">{item.value ? item.value.toLocaleString("ru-RU") : "—"}</p>
                  <p className="text-[10px] text-[#9ca3af]">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<FileTextIcon className="size-4" />} label="Published articles" value={stats.publishedContent} />
          <StatCard icon={<BookOpenIcon className="size-4" />} label="Bidding systems" value={stats.biddingSystems} />
        </div>
      )}

      {/* No player linked */}
      {!player ? (
        <div className="rounded-xl border border-dashed border-[#d8dbe1] bg-[#f9fafb] p-5 text-center">
          <UserIcon className="mx-auto size-8 text-[#d1d5db]" />
          <p className="mt-2 text-sm text-[#6e7788]">No player profile linked</p>
          <Link
            href="/dashboard/settings"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            Link your Bridgesport player
          </Link>
        </div>
      ) : null}

      {/* Recent content */}
      {recentContent.length > 0 ? (
        <div className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1f2734]">Recent articles</h2>
            <Link href="/dashboard/content" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentContent.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/content/${item.id}`}
                className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] p-2.5 transition hover:bg-[#f9fafb]"
              >
                {item.coverImageUrl ? (
                  <img src={item.coverImageUrl} alt="" className="size-10 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded bg-[#f3f4f6]">
                    <FileTextIcon className="size-4 text-[#9ca3af]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1f2734]">{item.title}</p>
                  <p className="text-[11px] text-[#9ca3af]">
                    {item.format.replace(/_/g, " ")}
                    {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString("ru-RU")}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Bidding systems */}
      {systems.length > 0 ? (
        <div className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1f2734]">Bidding systems</h2>
          <div className="mt-3 space-y-2">
            {systems.map((sys) => (
              <div key={sys.id} className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] p-2.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded bg-[#f3f4f6]">
                  <BookOpenIcon className="size-4 text-[#9ca3af]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1f2734]">{sys.title}</p>
                  {sys.description ? (
                    <p className="truncate text-[11px] text-[#9ca3af]">{sys.description}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Member since */}
      {user.createdAt ? (
        <p className="flex items-center gap-1 text-xs text-[#9ca3af]">
          <CalendarIcon className="size-3" />
          Member since {new Date(user.createdAt).toLocaleDateString("ru-RU", { year: "numeric", month: "long" })}
        </p>
      ) : null}
    </div>
  )
}

export default function DashboardProfilePage() {
  const { data: session, status } = useSession()
  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isGuest = status === "unauthenticated"
  const currentUser = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status !== "authenticated") return
    setIsLoading(true)
    fetch("/api/users/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile")
        const data = await res.json()
        setProfileData(data)
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setIsLoading(false))
  }, [status])

  return (
    <SidebarProvider>
      <AppSidebar visualVariant="dense" roles={roles} />
      <SidebarInset className="h-svh overflow-hidden bg-[#f6f7fb]">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[#d8dbe1] bg-[#f6f7fb]/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <DashboardFaviconToggle />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 [&[data-slot=separator]]:bg-[#cfd5df]" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard" className="text-[#6e7788]">Portal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[#1f2734]">Profile</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TopbarGlobalSearch className="hidden sm:flex" />
            {!isGuest ? <TopbarNotifications /> : null}
            <TopbarUserMenu user={currentUser} isGuest={isGuest} />
          </div>
        </header>

        <main className="relative flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-3xl">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2Icon className="size-6 animate-spin text-[#9ca3af]" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">{error}</div>
            ) : isGuest ? (
              <div className="rounded-xl border border-[#d8dbe1] bg-white p-5 text-center">
                <p className="text-sm text-[#6e7788]">Sign in to view your profile.</p>
                <Link href="/auth/signin?callbackUrl=/dashboard/profile" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                  Sign in
                </Link>
              </div>
            ) : profileData ? (
              <ProfileContent data={profileData} />
            ) : null}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
