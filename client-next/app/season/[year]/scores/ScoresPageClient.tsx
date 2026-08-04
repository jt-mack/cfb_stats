"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useCalendar, useSeasonContext, useWeekGames } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";

type StatusFilter = "all" | "completed" | "live" | "upcoming";

function seasontypeFromLabel(label: string | undefined): number {
  if (label === "postseason") return 3;
  if (label === "preseason") return 1;
  return 2;
}

export default function ScoresPageClient() {
  const router = useRouter();
  const { year, seasonNum, isValidSeason } = useSeasonParams();
  const { data: context } = useSeasonContext(seasonNum);
  const { data: calendar = [], isLoading: calLoading } = useCalendar(seasonNum);

  const defaultWeek = context?.currentWeek ?? calendar[0]?.week ?? 1;
  const [week, setWeek] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const selectedWeek = week ?? defaultWeek;
  const selectedEntry = calendar.find((w) => w.week === selectedWeek) ?? calendar[0];
  const seasontype = seasontypeFromLabel(selectedEntry?.seasonType);

  const { data: games = [], isLoading, isError } = useWeekGames(
    seasonNum,
    selectedWeek,
    Boolean(selectedWeek),
    seasontype
  );

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "completed") return g.completed;
      if (statusFilter === "upcoming") return !g.completed && !String(g.status ?? "").match(/in|live|half/i);
      const status = String(g.status ?? "").toLowerCase();
      return !g.completed && /in|live|half|progress/.test(status);
    });
  }, [games, statusFilter]);

  if (!year || !isValidSeason) return <PageError message="Invalid route." />;
  if (calLoading) return <PageSpinner heightClass="h-[40vh]" />;

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-zinc-100">{year} Scores</h1>
        <p className="text-sm text-zinc-400">Browse games by week and season type.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-center">
        <label className="text-sm text-zinc-400">
          Week{" "}
          <select
            className="ml-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
            value={selectedWeek}
            onChange={(e) => setWeek(Number(e.target.value))}
          >
            {calendar.length > 0 ? (
              calendar.map((w) => (
                <option key={`${w.seasonType}-${w.week}`} value={w.week}>
                  {w.seasonType === "postseason" ? "Post" : "Week"} {w.week}
                </option>
              ))
            ) : (
              Array.from({ length: 15 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="text-sm text-zinc-400">
          Status{" "}
          <select
            className="ml-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="live">Live</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </label>
        <Link href={`/season/${year}/week/${selectedWeek}`} className="text-sm text-zinc-500 hover:text-zinc-300">
          Week page →
        </Link>
      </div>

      {isLoading ? (
        <PageSpinner heightClass="h-[30vh]" />
      ) : isError ? (
        <PageError message="Failed to load games for this week." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((g) => (
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
          {!filtered.length && (
            <p className="text-center text-zinc-400">No games found for this filter.</p>
          )}
        </>
      )}
    </div>
  );
}
