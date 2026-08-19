"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useWeekGames } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { Button } from "@/components/ui/button";

export default function WeekPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { year, week, seasonNum, weekNum, isValidSeason, isValidWeek } = useSeasonParams();

  const seasontypeParam = Number(searchParams.get("seasontype"));
  const seasontype =
    seasontypeParam === 1 || seasontypeParam === 3 ? seasontypeParam : 2;

  const { data: games = [], isLoading, isError } = useWeekGames(
    seasonNum,
    weekNum,
    true,
    seasontype
  );

  if (!year || !week || !isValidSeason || !isValidWeek) {
    return <PageError message="Invalid route." />;
  }

  if (isLoading) return <PageSpinner heightClass="h-[40vh]" />;

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center">
        <Button variant="link" size="sm" asChild>
          <Link href={`/season/${year}`}>← Back to season</Link>
        </Button>
        <h1 className="text-xl font-semibold text-foreground mt-2">
          {year} — {seasontype === 3 ? "Postseason Week" : "Week"} {week}
        </h1>
      </div>
      {isError ? (
        <PageError message="Failed to load games for this week." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((g) => (
              <Button
                key={g.id}
                type="button"
                variant="outline"
                onClick={() => router.push(`/season/${year}/game/${g.id}`)}
                className="h-auto flex-col items-start gap-1 px-4 py-3 whitespace-normal"
              >
                <span className="text-sm text-foreground">
                  {g.awayTeam} @ {g.homeTeam}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {g.completed
                    ? `Final: ${g.awayPoints} – ${g.homePoints}`
                    : g.startDate
                      ? new Date(g.startDate).toLocaleString("en-US")
                      : "TBD"}
                </span>
              </Button>
            ))}
          </div>
          {!games.length && (
            <p className="text-center text-muted-foreground">No games found for this week.</p>
          )}
        </>
      )}
    </div>
  );
}
