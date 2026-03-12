"use client"

import Link from "next/link"
import { ArrowRightIcon, SparklesIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type TopbarGuestWelcomeProps = {
  className?: string
}

export function TopbarGuestWelcome({ className }: TopbarGuestWelcomeProps) {
  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-full border border-[#d8dbe1] bg-white/80 px-2.5 py-1 text-xs text-[#5f6d83] shadow-sm backdrop-blur md:inline-flex",
        className
      )}
      aria-label="Welcome hint for guest users"
    >
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-[#d8dbe1] bg-white text-[#2f3f61]">
        <SparklesIcon className="size-3.5" />
      </span>
      <p className="whitespace-nowrap">
        New here?
        {" "}
        <span className="font-medium text-[#1f2734]">Read, discuss, learn.</span>
      </p>
      <Link
        href="/auth/signin"
        className="inline-flex items-center gap-1 rounded-full border border-[#cfd5df] bg-[#eef2fa] px-2 py-0.5 font-medium text-[#223250] transition-colors hover:bg-[#e2e9f6]"
      >
        Sign in
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  )
}

