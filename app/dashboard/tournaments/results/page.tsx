import { desc, gt } from "drizzle-orm"

import { db } from "@/lib/db/drizzle/client"
import { bridgesportTournaments } from "@/lib/db/drizzle/schema"

const RESULTS_LIMIT = 120

export default async function TournamentsResultsPage() {
  let rows: Array<{
    id: string
    sourceTournamentId: number
    name: string
    year: number | null
    city: string | null
    resultsUrl: string | null
    tournamentUrl: string | null
    resultsRows: number
  }> = []
  let loadError = false

  try {
    rows = await db
      .select({
        id: bridgesportTournaments.id,
        sourceTournamentId: bridgesportTournaments.sourceTournamentId,
        name: bridgesportTournaments.name,
        year: bridgesportTournaments.year,
        city: bridgesportTournaments.city,
        resultsUrl: bridgesportTournaments.resultsUrl,
        tournamentUrl: bridgesportTournaments.tournamentUrl,
        resultsRows: bridgesportTournaments.resultsRows,
      })
      .from(bridgesportTournaments)
      .where(gt(bridgesportTournaments.resultsRows, 0))
      .orderBy(
        desc(bridgesportTournaments.year),
        desc(bridgesportTournaments.sourceTournamentId),
      )
      .limit(RESULTS_LIMIT)
  } catch (error) {
    loadError = true
    console.error("Failed to render tournament results", error)
  }

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-6">
      <section className="rounded-xl border border-[#d8dbe1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-[#1f2734]">Tournament results</h1>
          {!loadError ? (
            <p className="text-sm text-[#6e7788]">Recent records: {rows.length}</p>
          ) : null}
        </div>

        {loadError ? (
          <p className="mt-2 text-sm text-[#6e7788]">
            Data source is temporarily unavailable. Start with
            {" "}
            <code>npm run dev:remote</code>.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {rows.length === 0 ? (
              <p className="rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3 text-sm text-[#6e7788]">
                No historical results found.
              </p>
            ) : (
              rows.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#1f2734]">{item.name}</p>
                    <p className="text-xs text-[#6e7788]">{item.year ?? "—"}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6e7788]">
                    {item.city ? <span>{item.city}</span> : null}
                    <span>· rows: {item.resultsRows}</span>
                    {item.resultsUrl ? (
                      <a
                        href={item.resultsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#355892] hover:underline"
                      >
                        Results
                      </a>
                    ) : item.tournamentUrl ? (
                      <a
                        href={item.tournamentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#355892] hover:underline"
                      >
                        Tournament
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  )
}
