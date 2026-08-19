"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useCalendar, useSeasonContext, useWeekGames } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type StatusFilter = "all" | "completed" | "live" | "upcoming";

function seasontypeFromLabel(label: string | undefined): number {
  if (label === "postseason") return 3;
  if (label === "preseason") return 1;
  return 2;
}

/**
 * Regular and postseason week numbers overlap (Week 1 vs Post 1), so the
 * picker keys entries by season type + week.
 */
function entryKey(entry: { seasonType: string; week: number }): string {
  return `${entry.seasonType}:${entry.week}`;
}

export default function ScoresPageClient() {
  const router = useRouter();
  const { year, seasonNum, isValidSeason } = useSeasonParams();
  const { data: context } = useSeasonContext(seasonNum);
  const { data: calendar = [], isLoading: calLoading } = useCalendar(seasonNum);

  const defaultWeek = context?.currentWeek ?? calendar[0]?.week ?? 1;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const phaseType = context?.phase === "postseason" ? "postseason" : "regular";
  const defaultEntry =
    calendar.find((w) => w.seasonType === phaseType && w.week === defaultWeek) ??
    calendar.find((w) => w.week === defaultWeek) ??
    calendar[0];
  const selectedEntry =
    (selectedKey != null ? calendar.find((w) => entryKey(w) === selectedKey) : undefined) ??
    defaultEntry;
  const selectedWeek = selectedEntry?.week ?? defaultWeek;
  const seasontype = seasontypeFromLabel(selectedEntry?.seasonType);
  const selectValue = selectedEntry ? entryKey(selectedEntry) : `regular:${defaultWeek}`;

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

  const weekOptions =
    calendar.length > 0
      ? calendar.map((w) => ({
          value: entryKey(w),
          label: `${w.seasonType === "postseason" ? "Post" : "Week"} ${w.week}`,
        }))
      : Array.from({ length: 15 }, (_, i) => i + 1).map((w) => ({
          value: `regular:${w}`,
          label: `Week ${w}`,
        }));

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-foreground">{year} Scores</h1>
        <p className="text-sm text-muted-foreground">Browse games by week and season type.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Week</span>
          <Select
            value={selectValue}
            onValueChange={(v) => setSelectedKey(v)}
          >
            <SelectTrigger className="w-[140px]" aria-label="Select week">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[140px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="link" size="sm" asChild>
          <Link href={`/season/${year}/week/${selectedWeek}?seasontype=${seasontype}`}>
            Week page →
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner heightClass="h-[30vh]" />
      ) : isError ? (
        <PageError message="Failed to load games for this week." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((g) => (
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
          {!filtered.length && (
            <p className="text-center text-muted-foreground">No games found for this filter.</p>
          )}
        </>
      )}
    </div>
  );
}
