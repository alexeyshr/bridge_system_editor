"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { CheckCircle2Icon, KeyRoundIcon, LoaderCircleIcon, ShieldAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/react"

export default function SpaceInviteAcceptPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ""
  const { data: session, status } = useSession()

  const acceptInviteMutation = trpc.spaces.invites.accept.useMutation()

  const isAuthenticated = status === "authenticated"
  const callbackUrl = `/space-invite/${encodeURIComponent(token)}`

  const acceptSuccess = acceptInviteMutation.data?.invite?.status === "accepted"
  const acceptedSpaceId = acceptInviteMutation.data?.invite?.spaceId

  return (
    <main className="min-h-svh bg-[#f6f7fb] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <section className="rounded-2xl border border-[#d8dbe1] bg-white/90 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-5 text-[#4b5f8b]" />
            <h1 className="text-2xl font-semibold text-[#1f2734]">Space invite</h1>
          </div>

          {!isAuthenticated ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-[#5f6a7b]">
                Sign in first, then accept the invite token securely.
              </p>
              <Link
                href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="inline-flex h-9 items-center rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-3 text-sm font-medium text-[#2f466d] transition hover:bg-[#e2ebfa]"
              >
                Go to sign in
              </Link>
            </div>
          ) : acceptSuccess ? (
            <div className="mt-4 space-y-3">
              <p className="inline-flex items-center gap-1.5 rounded-lg border border-[#bbdcc8] bg-[#effaf3] px-3 py-2 text-sm text-[#2f634a]">
                <CheckCircle2Icon className="size-4" />
                Invite accepted successfully.
              </p>
              <div>
                <Link
                  href={acceptedSpaceId ? `/dashboard/spaces?spaceId=${encodeURIComponent(acceptedSpaceId)}` : "/dashboard/spaces"}
                  className="inline-flex h-9 items-center rounded-lg border border-[#cfd5df] bg-[#eef3fb] px-3 text-sm font-medium text-[#2f466d] transition hover:bg-[#e2ebfa]"
                >
                  Open spaces workspace
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-[#5f6a7b]">
                Logged in as <span className="font-medium text-[#1f2734]">{session?.user?.email || session?.user?.name || "user"}</span>.
              </p>
              <Button
                variant="secondary"
                disabled={acceptInviteMutation.isPending || !token}
                onClick={() => acceptInviteMutation.mutate({ token })}
              >
                {acceptInviteMutation.isPending ? (
                  <>
                    <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept invite"
                )}
              </Button>
              {acceptInviteMutation.error ? (
                <p className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5cad0] bg-[#fff2f4] px-3 py-2 text-sm text-[#8b3240]">
                  <ShieldAlertIcon className="size-4" />
                  {acceptInviteMutation.error.message || "Invite could not be accepted."}
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
