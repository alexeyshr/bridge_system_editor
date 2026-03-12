import { HistoryIcon } from "lucide-react"

import { DashboardShellPage } from "@/components/dashboard-shell-page"

export default function PlayersHistoryPage() {
  return (
    <DashboardShellPage
      breadcrumbs={[
        { label: "Portal", href: "/dashboard" },
        { label: "Players", href: "/dashboard/players/ratings" },
        { label: "History" },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-xl border border-[#d8dbe1] bg-[#f5f7fc] text-[#4a5f86]">
              <HistoryIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#1f2734]">Player history</h1>
              <p className="mt-1 text-sm text-[#6e7788]">
                Section for historical rating movement and participation timeline by player.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-[#d8dbe1] bg-white/75 p-5 text-sm text-[#6e7788]">
          History page is prepared. We can next add per-player timeline charts from archived
          rating snapshots.
        </section>
      </div>
    </DashboardShellPage>
  )
}

