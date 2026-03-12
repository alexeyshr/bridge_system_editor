import { BarChart3Icon } from "lucide-react"

import { DashboardShellPage } from "@/components/dashboard-shell-page"

export default function PlayersRatingsPage() {
  return (
    <DashboardShellPage
      breadcrumbs={[
        { label: "Portal", href: "/dashboard" },
        { label: "Players", href: "/dashboard/players/ratings" },
        { label: "Ratings" },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-xl border border-[#d8dbe1] bg-[#f5f7fc] text-[#4a5f86]">
              <BarChart3Icon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#1f2734]">Player ratings</h1>
              <p className="mt-1 text-sm text-[#6e7788]">
                Section for current ranking lists, top players, and rating trends.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-[#d8dbe1] bg-white/75 p-5 text-sm text-[#6e7788]">
          Ratings UI is ready as a dedicated sidebar section. Next step: connect this page to
          BridgeSport rating snapshots and render sortable leaderboard cards.
        </section>
      </div>
    </DashboardShellPage>
  )
}

