"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useWeekGames } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";

export default function WeekPageClient() {
  const router = useRouter();
  const { year, week, seasonNum, weekNum, isValidSeason, isValidWeek } = useSeasonParams();
  const { data: games = [], isLoading, isError } = useWeekGames(seasonNum, weekNum);

  if (!year || !week || !isValidSeason || !isValidWeek) {
    return <PageError message="Invalid route." />;
  }

  if (isLoading) return <PageSpinner heightClass="h-[40vh]" />;

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center">
        <Link href={`/season/${year}`} className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Back to season
        </Link>
        <h1 className="text-xl font-semibold text-zinc-100 mt-2">
          {year} — Week {week}
        </h1>
      </div>
      {isError ? (
        <PageError message="Failed to load games for this week." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => router.push(`/season/${year}/game/${g.id}`)}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-3 text-left hover:bg-zinc-700"
              >
                <p className="text-sm text-zinc-100">
                  {g.awayTeam} @ {g.homeTeam}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {g.completed
                    ? `Final: ${g.awayPoints} – ${g.homePoints}`
                    : g.startDate
                      ? new Date(g.startDate).toLocaleString("en-US")
                      : "TBD"}
                </p>
              </button>
            ))}
          </div>
          {!games.length && (
            <p className="text-center text-zinc-400">No games found for this week.</p>
          )}
        </>
      )}
    </div>
  );
}
