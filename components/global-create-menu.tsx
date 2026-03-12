"use client"

import { PlusIcon } from "lucide-react"

import { HEADER_CREATE_ACTIONS } from "@/lib/portal-config/header-actions"
import {
  type PortalCapability,
  type PortalRole,
  hasAnyCapability,
  listCapabilitiesForRoles,
} from "@/lib/portal-access"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type CreateAction = {
  id: string
  label: string
  href: string
  requires: PortalCapability[]
}

export function GlobalCreateMenu({
  roles,
  className,
}: {
  roles: PortalRole[]
  className?: string
}) {
  const capabilities = listCapabilitiesForRoles(roles)
  const actions = HEADER_CREATE_ACTIONS.filter((action) =>
    hasAnyCapability(capabilities, action.requires)
  ) as CreateAction[]

  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hidden items-center gap-2 rounded-xl border border-[#cfd5df] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#1f2734] shadow-sm transition-colors hover:bg-[#edf2fa] md:inline-flex",
          className
        )}
      >
        <PlusIcon className="size-4 text-[#344863]" />
        <span>Create</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl border border-[#cfd5df] bg-white/98 p-1.5 text-[#1f2734] shadow-[0_12px_35px_-20px_rgba(15,23,42,0.75)]"
      >
        {actions.map((action, index) => (
          <div key={action.id}>
            <DropdownMenuItem
              className="rounded-lg px-2.5 py-2 text-[14px] font-medium text-[#1f2734] focus:bg-[#e6edf9] focus:text-[#12213c]"
              onClick={() => {
                if (action.href && action.href !== "#") {
                  window.location.href = action.href
                }
              }}
            >
              {action.label}
            </DropdownMenuItem>
            {index === 1 && actions.length > 3 ? (
              <DropdownMenuSeparator className="mx-0.5 my-1 bg-[#d8dbe1]" />
            ) : null}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
