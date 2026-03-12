"use client"

import { LogInIcon, LogOutIcon, SettingsIcon, UserIcon } from "lucide-react"
import { signOut } from "next-auth/react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type TopbarUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

type TopbarUserMenuProps = {
  user: TopbarUser
  isGuest?: boolean
  className?: string
}

function getInitials(user: TopbarUser) {
  const source = user.name?.trim() || user.email?.trim() || "User"
  const parts = source.split(" ").filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function TopbarUserMenu({ user, isGuest = false, className }: TopbarUserMenuProps) {
  const label = user.name || user.email || "Portal user"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-[#1f2734] shadow-none transition-colors hover:bg-[#edf2fa]/75",
          className
        )}
        aria-label="Open user menu"
      >
        {isGuest ? (
          <span className="inline-flex size-7 items-center justify-center rounded-full text-[#51617b]">
            <LogInIcon className="size-4" />
          </span>
        ) : (
          <Avatar size="sm" className="size-7">
            <AvatarImage src={user.image ?? undefined} alt={label} />
            <AvatarFallback>{getInitials(user)}</AvatarFallback>
          </Avatar>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl border border-[#cfd5df] bg-white/98 p-1.5 text-[#1f2734] shadow-[0_12px_35px_-20px_rgba(15,23,42,0.75)]"
      >
        {isGuest ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 font-normal">
                <div className="space-y-0.5">
                  <p className="truncate text-sm font-semibold text-[#1f2734]">Guest mode</p>
                  <p className="truncate text-xs text-[#6e7788]">
                    Sign in to access profile tools.
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="mx-0.5 my-1 bg-[#d8dbe1]" />
            <DropdownMenuItem
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-[#1f2734] focus:bg-[#e6edf9] focus:text-[#12213c]"
              onClick={() => {
                window.location.href = "/auth/signin"
              }}
            >
              <LogInIcon className="size-4 text-[#50607a]" />
              Sign in
            </DropdownMenuItem>
          </>
        ) : (
          <>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 font-normal">
            <div className="space-y-0.5">
              <p className="truncate text-sm font-semibold text-[#1f2734]">{label}</p>
              <p className="truncate text-xs text-[#6e7788]">
                {user.email || "No email in session"}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0.5 my-1 bg-[#d8dbe1]" />
        <DropdownMenuGroup>
          <DropdownMenuItem className="rounded-lg px-2.5 py-2 text-sm font-medium text-[#1f2734] focus:bg-[#e6edf9] focus:text-[#12213c]">
            <UserIcon className="size-4 text-[#50607a]" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-[#1f2734] focus:bg-[#e6edf9] focus:text-[#12213c]"
            onClick={() => {
              window.location.href = "/dashboard/settings"
            }}
          >
            <SettingsIcon className="size-4 text-[#50607a]" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0.5 my-1 bg-[#d8dbe1]" />
        <DropdownMenuItem
          className="rounded-lg px-2.5 py-2 text-sm font-medium text-[#b3362d] focus:bg-[#fdeae8] focus:text-[#9a2e26]"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOutIcon className="size-4" />
          Sign out
        </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
