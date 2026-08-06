"use client";

import Link from "next/link";
import type { SeasonContext } from "@/lib/repos/seasonRepo";
import { useScoreboardStripGames } from "@/lib/hooks/queries";
import { scoreboardStripTitle } from "@/lib/scoreboardStripHelpers";

type ScoreboardStripProps = {
  year: string;
  seasonContext: SeasonContext | null;
  enabled?: boolean;
};

export function ScoreboardStrip({
  year,
  seasonContext,
  enabled = true,
}: ScoreboardStripProps) {
  const yearNum = Number(year);
  const phase = seasonContext?.phase ?? null;
  const currentWeek = seasonContext?.currentWeek ?? null;
  const defaultSeason = seasonContext?.defaultSeason;
  const isCurrentSeason =
    defaultSeason != null && !Number.isNaN(yearNum) && yearNum === defaultSeason;

  const { data, isLoading } = useScoreboardStripGames(
    yearNum,
    phase,
    currentWeek,
    enabled,
    defaultSeason,
    seasonContext?.isActive
  );
  const games = Array.isArray(data) ? data.slice(0, 8) : [];

  if (!enabled || isLoading) return null;

  if (!games.length) {
    if (phase === "preseason" && seasonContext?.firstGameDate) {
      return (
        <div className="mb-4 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 text-center">
          Season starts soon — Week 1 games will appear here.
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-zinc-300">
          {scoreboardStripTitle(phase, currentWeek, isCurrentSeason)}
        </h3>
        {currentWeek != null && (
          <Link
            href={`/season/${year}/week/${currentWeek}`}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/season/${year}/game/${g.id}`}
            className="shrink-0 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 min-w-[140px] hover:bg-zinc-700"
          >
            <p className="text-xs text-zinc-400 truncate">{g.awayTeam}</p>
            <p className="text-xs text-zinc-100 font-medium truncate">{g.homeTeam}</p>
            <p className="text-sm text-zinc-200 mt-1">
              {g.awayPoints != null && g.homePoints != null
                ? `${g.awayPoints} – ${g.homePoints}`
                : g.startDate
                  ? new Date(g.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "Scheduled"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
