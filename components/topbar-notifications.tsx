"use client"

import { BellIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type TopbarNotificationsProps = {
  className?: string
}

const demoNotifications = [
  {
    id: "n1",
    title: "Stage 3 registration",
    meta: "Deadline moved to March 14, 2026",
  },
  {
    id: "n2",
    title: "New moderation mention",
    meta: "You were mentioned in Discussions",
  },
]

export function TopbarNotifications({ className }: TopbarNotificationsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-md border border-transparent bg-transparent text-[#1f2734] shadow-none transition-colors hover:bg-[#edf2fa]/75",
          className
        )}
        aria-label="Notifications"
      >
        <BellIcon className="size-4.5" />
        <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#d24b3d]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-xl border border-[#cfd5df] bg-white/98 p-1.5 text-[#1f2734] shadow-[0_12px_35px_-20px_rgba(15,23,42,0.75)]"
      >
        <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-[0.08em] text-[#707b8d]">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0.5 my-1 bg-[#d8dbe1]" />
        {demoNotifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="rounded-lg px-2.5 py-2 text-sm text-[#1f2734] focus:bg-[#e6edf9] focus:text-[#12213c]"
          >
            <div className="space-y-0.5">
              <p className="font-medium">{notification.title}</p>
              <p className="text-xs text-[#6e7788]">{notification.meta}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
